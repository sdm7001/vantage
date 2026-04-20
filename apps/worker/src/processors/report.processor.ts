import { prisma } from '@vantage/database';
import type { ReportGenerateJobData } from '@vantage/queue';
import { runPainPointsAgent } from '../agents/pain-points.agent';
import { runInternalBriefAgent } from '../agents/internal-brief.agent';
import { runReportWriterAgent } from '../agents/report-writer.agent';
import { runQaGuardrails } from '../agents/qa-guardrails.agent';
import { generateReportPDF } from '../lib/pdf';
import { uploadBuffer, uploadJson, buildR2Key, getSignedDownloadUrl } from '../lib/r2';
import type { DimensionScore, WeightedScore, AuditCategory } from '@vantage/shared';
import { CATEGORY_WEIGHTS } from '@vantage/shared';

export async function reportProcessor(data: ReportGenerateJobData): Promise<void> {
  const { prospectId, auditId, reportId } = data;

  const [prospect, audit, dimensionScores] = await Promise.all([
    prisma.prospect.findUniqueOrThrow({ where: { id: prospectId }, include: { organization: { include: { brandConfig: true } } } }),
    prisma.websiteAudit.findUniqueOrThrow({ where: { id: auditId }, include: { dimensionScores: true, recommendations: true } }),
    prisma.auditDimensionScore.findMany({ where: { auditId } }),
  ]);

  const primaryContact = await prisma.contact.findFirst({
    where: { prospectId, isPrimary: true },
  }) ?? await prisma.contact.findFirst({ where: { prospectId } });

  const rawBrand = prospect.organization.brandConfig ?? {
    companyName: 'TexMG', senderName: 'Scott', senderEmail: 'scott@texmg.com',
    bookingUrl: null, primaryColor: '#1a1a2e', accentColor: '#1565C0', logoR2Key: null,
  };

  // Resolve logo URL: R2 upload takes priority; fall back to the public app asset
  const logoUrl = rawBrand.logoR2Key
    ? `${process.env.R2_PUBLIC_URL ?? ''}/${rawBrand.logoR2Key}`
    : `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/tmg-logo.svg`;

  const brand = { ...rawBrand, logoUrl };

  // Build WeightedScore from stored dimension scores
  const { weightedScore, allDimensions } = buildWeightedScoreFromDb(dimensionScores, audit.overallScore ?? 0);

  // Run pain points agent
  const painPoints = await runPainPointsAgent(
    prospect.companyName ?? prospect.domain,
    prospect.domain,
    prospect.industry ?? undefined,
    weightedScore,
    {}
  );

  // Run internal brief in parallel with report writing
  const [{ markdown: briefMarkdown, appointmentAngle }, reportData] = await Promise.all([
    runInternalBriefAgent(
      prospect.companyName ?? prospect.domain,
      prospect.domain,
      prospect.industry ?? undefined,
      primaryContact?.title ?? undefined,
      weightedScore,
      painPoints
    ),
    runReportWriterAgent(
      prospect.companyName ?? prospect.domain,
      prospect.domain,
      weightedScore,
      allDimensions,
      painPoints,
      brand
    ),
  ]);

  // Save internal brief
  await prisma.internalBrief.create({
    data: {
      prospectId,
      auditId,
      markdownContent: briefMarkdown,
      appointmentAngle,
    },
  });

  // Save pain point analysis
  await prisma.painPointAnalysis.create({
    data: {
      prospectId,
      auditId,
      primaryPainPoint: painPoints.primaryPainPoint,
      outreachAngles: painPoints.outreachAngles,
      valueHooks: painPoints.valueHooks,
    },
  });

  // QA check on report sections
  const allFindings = allDimensions.flatMap(d => [...d.criticalFixes, ...d.wins]);
  const reportText = reportData.sections.map(s => s.markdown).join('\n');
  const qa = await runQaGuardrails(reportText, allFindings, 'report_section');

  if (!qa.passed) {
    console.warn('Report QA violations:', qa.violations);
    // Log but don't block — warnings only
  }

  // Attach IDs
  reportData.prospectId = prospectId;
  reportData.auditId = auditId;

  // Generate PDF
  const pdfBuffer = await generateReportPDF(reportData);

  // Upload PDF + JSON to R2
  const pdfKey = buildR2Key('reports', reportId, 'report.pdf');
  const jsonKey = buildR2Key('reports', reportId, 'report.json');
  await Promise.all([
    uploadBuffer(pdfKey, pdfBuffer, 'application/pdf'),
    uploadJson(jsonKey, reportData),
  ]);

  // Generate signed URL (valid 7 days)
  const pdfUrl = await getSignedDownloadUrl(pdfKey, 7 * 24 * 3600);

  await prisma.prospectReport.update({
    where: { id: reportId },
    data: {
      pdfKey,
      pdfUrl,
      markdownContent: reportData.sections.map(s => `## ${s.title}\n${s.markdown}`).join('\n\n'),
      jsonContent: reportData as never,
      status: 'ready',
      generatedAt: new Date(),
    },
  });

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { status: 'REPORT_READY' },
  });

  console.log(`Report ${reportId} generated and uploaded: ${pdfKey}`);
}

type DbDimensionScore = { dimension: string; category: string; score: number; wins: unknown; criticalFixes: unknown; notes: string | null };

function buildWeightedScoreFromDb(
  rows: DbDimensionScore[],
  storedOverall: number
): { weightedScore: WeightedScore; allDimensions: DimensionScore[] } {
  const allDimensions: DimensionScore[] = rows.map(r => ({
    dimension: r.dimension as never,
    category: r.category as AuditCategory,
    score: r.score,
    wins: r.wins as string[],
    criticalFixes: r.criticalFixes as string[],
    notes: r.notes ?? undefined,
  }));

  const byCategory = allDimensions.reduce((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {} as Record<AuditCategory, DimensionScore[]>);

  let weightedSum = 0;
  const categories = (Object.keys(CATEGORY_WEIGHTS) as AuditCategory[]).map(cat => {
    const dims = byCategory[cat] ?? [];
    const avg = dims.length ? dims.reduce((s, d) => s + d.score, 0) / dims.length : 0;
    const scaled = Math.round(avg * 10);
    weightedSum += scaled * CATEGORY_WEIGHTS[cat];
    return { category: cat, score: scaled, weight: CATEGORY_WEIGHTS[cat], dimensions: dims };
  });

  const p0Penalty = Math.min(5, allDimensions.filter(d => d.score <= 2).length);
  const overall = storedOverall || Math.max(0, Math.round(weightedSum) - p0Penalty);

  return { weightedScore: { overall, categories, p0Penalty }, allDimensions };
}
