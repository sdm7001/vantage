import { prisma } from '@vantage/database';
import type { AuditEvaluateJobData } from '@vantage/queue';
import { runEvaluationCoordinator } from '../agents/evaluation/coordinator';
import { getR2Client } from '../lib/r2-internal';
import type { CrawlBundle } from '@vantage/shared';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getEnv } from '@vantage/config';

export async function auditEvaluateProcessor(data: AuditEvaluateJobData): Promise<void> {
  const { prospectId, auditId } = data;

  const audit = await prisma.websiteAudit.findUniqueOrThrow({ where: { id: auditId } });

  if (!audit.crawlDataKey) {
    throw new Error(`Audit ${auditId} has no crawl data`);
  }

  // Load crawl bundle from R2
  const bundle = await loadBundleFromR2(audit.crawlDataKey);

  // Run all 5 subagents in parallel via coordinator
  const { weightedScore, allDimensions } = await runEvaluationCoordinator(bundle);

  // Persist dimension scores
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

  // Persist recommendations
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

async function loadBundleFromR2(key: string): Promise<CrawlBundle> {
  const env = getEnv();
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  const res = await client.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

import type { DimensionScore } from '@vantage/shared';

function buildRecommendations(dims: DimensionScore[]) {
  const recs: Array<{ priority: 'P0' | 'P1' | 'P2'; title: string; description: string; effort: string; impact: string; category: string }> = [];

  dims.filter(d => d.score <= 2).slice(0, 4).forEach(d =>
    recs.push({ priority: 'P0', title: `Fix: ${String(d.dimension).replace(/_/g, ' ')}`, description: d.criticalFixes[0] ?? '', effort: 'medium', impact: 'high', category: d.category })
  );
  dims.filter(d => d.score >= 3 && d.score <= 5).slice(0, 5).forEach(d =>
    recs.push({ priority: 'P1', title: `Improve: ${String(d.dimension).replace(/_/g, ' ')}`, description: d.criticalFixes[0] ?? '', effort: 'medium', impact: 'medium', category: d.category })
  );
  dims.filter(d => d.score >= 6 && d.score <= 7).slice(0, 4).forEach(d =>
    recs.push({ priority: 'P2', title: `Enhance: ${String(d.dimension).replace(/_/g, ' ')}`, description: d.criticalFixes[0] ?? '', effort: 'low', impact: 'low', category: d.category })
  );

  return recs;
}
