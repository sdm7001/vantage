import { prisma } from '@vantage/database';
import type { AuditCrawlJobData } from '@vantage/queue';
import { crawlDomain } from '../lib/crawler';
import { uploadJson, uploadBuffer, buildR2Key } from '../lib/r2';
import { QUEUE_NAMES, JOB_OPTIONS } from '@vantage/queue';
import { Queue } from 'bullmq';
import { getRedis } from '../lib/redis';

export async function auditCrawlProcessor(data: AuditCrawlJobData): Promise<void> {
  const { prospectId, auditId, domain, workflowRunId } = data;

  await prisma.websiteAudit.update({
    where: { id: auditId },
    data: { status: 'crawling' },
  });

  const bundle = await crawlDomain(domain);

  // Upload crawl bundle JSON to R2
  const crawlKey = buildR2Key('audits', auditId, 'crawl-bundle.json');
  await uploadJson(crawlKey, bundle);

  // Upload screenshot if captured
  let screenshotKey: string | undefined;
  if (bundle.screenshot) {
    const screenshotBuffer = Buffer.from(bundle.screenshot, 'base64');
    screenshotKey = buildR2Key('audits', auditId, 'screenshot.png');
    await uploadBuffer(screenshotKey, screenshotBuffer, 'image/png');
    bundle.screenshot = screenshotKey; // replace base64 with key
  }

  await prisma.websiteAudit.update({
    where: { id: auditId },
    data: {
      crawlDataKey: crawlKey,
      screenshotKey,
      crawledAt: new Date(),
      status: 'evaluating',
    },
  });

  // Enqueue evaluation job
  const evaluateQueue = new Queue(QUEUE_NAMES.AUDIT_EVALUATE, { connection: getRedis() });
  await evaluateQueue.add(
    'evaluate',
    { orgId: data.orgId, prospectId, auditId, workflowRunId },
    JOB_OPTIONS[QUEUE_NAMES.AUDIT_EVALUATE]
  );

  console.log(`Crawl complete for ${domain}, queued evaluation`);
}
