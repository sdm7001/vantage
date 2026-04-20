import { prisma } from '@vantage/database';
import type { AuditEvaluateJobData } from '@vantage/queue';
import { runEvaluationCoordinator } from '../agents/evaluation/coordinator';
import { downloadJson } from '../lib/r2';
import type { CrawlBundle, DimensionScore } from '@vantage/shared';

export async function auditEvaluateProcessor(data: AuditEvaluateJobData): Promise<void> {
  const { prospectId, auditId } = data;

  const audit = await prisma.websiteAudit.findUniqueOrThrow({ where: { id: auditId } });

  if (!audit.crawlDataKey) {
    throw new Error(`Audit ${auditId} has no crawl data`);
  }

  const bundle = await downloadJson<CrawlBundle>(audit.crawlDataKey);

  const { weightedScore, allDimensions } = await runEvaluationCoordinator(bundle);

  await prisma.$transaction([
    ...allDimensions.map(d =>
      prisma.auditDimensionScore.upsert({
        where: { auditId_dimension: { auditId, dimension: String(d.dimension) } },
        update: {
          score: d.score,
          wins: d.wins,
          criticalFixes: d.criticalFixes,
          notes: d.notes ?? null,
        },
        create: {
          auditId,
          category: d.category,
          dimension: String(d.dimension),
          score: d.score,
          wins: d.wins,
          criticalFixes: d.criticalFixes,
          notes: d.notes ?? null,
        },
      })
    ),
  ]);

  const recs = buildRecommendations(allDimensions);
  await prisma.auditRecommendation.deleteMany({ where: { auditId } });
  if (recs.length) {
    await prisma.auditRecommendation.createMany({
      data: recs.map(r => ({ ...r, auditId })),
    });
  }

  await prisma.websiteAudit.update({
    where: { id: auditId },
    data: {
      overallScore: weightedScore.overall,
      evaluatedAt: new Date(),
      status: 'completed',
    },
  });

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { status: 'AUDITED' },
  });

  console.log(`Evaluation complete for audit ${auditId}: score ${weightedScore.overall}`);
}

function buildRecommendations(dims: DimensionScore[]) {
  const recs: Array<{ priority: 'P0' | 'P1' | 'P2'; title: string; description: string; effort: string; impact: string; category: string }> = [];

  dims.filter(d => d.score <= 2).slice(0, 4).forEach(d =>
    recs.push({ priority: 'P0', title: `Fix: ${String(d.dimension).replace(/_/g, ' ')}`, description: d.criticalFixes[0] ?? d.wins[0] ?? `Score ${d.score}/10 — critical attention required`, effort: 'medium', impact: 'high', category: d.category })
  );
  dims.filter(d => d.score >= 3 && d.score <= 5).slice(0, 5).forEach(d =>
    recs.push({ priority: 'P1', title: `Improve: ${String(d.dimension).replace(/_/g, ' ')}`, description: d.criticalFixes[0] ?? d.wins[0] ?? `Score ${d.score}/10 — room for improvement`, effort: 'medium', impact: 'medium', category: d.category })
  );
  dims.filter(d => d.score >= 6 && d.score <= 7).slice(0, 4).forEach(d =>
    recs.push({ priority: 'P2', title: `Enhance: ${String(d.dimension).replace(/_/g, ' ')}`, description: d.wins[0] ?? d.criticalFixes[0] ?? `Score ${d.score}/10 — performing well, minor gains available`, effort: 'low', impact: 'low', category: d.category })
  );

  return recs;
}
