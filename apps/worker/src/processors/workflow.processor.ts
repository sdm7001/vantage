import { prisma } from '@vantage/database';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_OPTIONS } from '@vantage/queue';
import type { WorkflowRunJobData } from '@vantage/queue';
import { getRedis } from '../lib/redis';

type WorkflowStep = { name: string; status: 'pending' | 'running' | 'done' | 'failed'; jobId?: string };

export async function workflowProcessor(data: WorkflowRunJobData): Promise<void> {
  const { orgId, prospectId, workflowRunId, runEnrich, runAudit, runReport } = data;
  const redis = getRedis();

  async function updateSteps(steps: WorkflowStep[]) {
    await prisma.workflowRun.update({
      where: { id: workflowRunId },
      data: { steps: steps as never },
    });
  }

  const steps: WorkflowStep[] = [];

  try {
    const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });

    // ── Step 1: Enrich ─────────────────────────────────────────────────────
    if (runEnrich) {
      steps.push({ name: 'enrich', status: 'running' });
      await updateSteps(steps);

      const enrichQueue = new Queue(QUEUE_NAMES.PROSPECT_ENRICH, { connection: redis });
      const enrichJob = await enrichQueue.add('enrich', { orgId, prospectId, workflowRunId }, JOB_OPTIONS[QUEUE_NAMES.PROSPECT_ENRICH]);

      // Wait for enrich to complete (poll with timeout)
      await waitForJob(enrichQueue, enrichJob.id!, 60_000);

      steps[steps.length - 1].status = 'done';
      await updateSteps(steps);
    }

    // ── Step 2: Audit ──────────────────────────────────────────────────────
    if (runAudit) {
      steps.push({ name: 'audit', status: 'running' });
      await updateSteps(steps);

      const audit = await prisma.websiteAudit.create({
        data: {
          prospectId,
          domain: prospect.domain,
          triggeredBy: 'workflow',
          status: 'pending',
        },
      });

      await prisma.prospect.update({ where: { id: prospectId }, data: { status: 'AUDITING' } });

      const crawlQueue = new Queue(QUEUE_NAMES.AUDIT_CRAWL, { connection: redis });
      const crawlJob = await crawlQueue.add('crawl', {
        orgId, prospectId, auditId: audit.id, domain: prospect.domain, workflowRunId,
      }, JOB_OPTIONS[QUEUE_NAMES.AUDIT_CRAWL]);

      // Wait for entire audit pipeline (crawl enqueues evaluate internally)
      // Poll on prospect status changing to AUDITED
      await waitForProspectStatus(prospectId, 'AUDITED', 5 * 60_000);

      steps[steps.length - 1].status = 'done';
      await updateSteps(steps);

      // ── Step 3: Report ────────────────────────────────────────────────────
      if (runReport) {
        steps.push({ name: 'report', status: 'running' });
        await updateSteps(steps);

        const completedAudit = await prisma.websiteAudit.findFirst({
          where: { prospectId, status: 'completed' },
          orderBy: { createdAt: 'desc' },
        });

        if (!completedAudit) {
          throw new Error('Audit did not complete successfully');
        }

        const report = await prisma.prospectReport.create({
          data: {
            prospectId,
            auditId: completedAudit.id,
            status: 'generating',
          },
        });

        await prisma.prospect.update({ where: { id: prospectId }, data: { status: 'REPORT_GENERATING' } });

        const reportQueue = new Queue(QUEUE_NAMES.REPORT_GENERATE, { connection: redis });
        await reportQueue.add('generate', {
          orgId, prospectId, auditId: completedAudit.id, reportId: report.id, workflowRunId,
        }, JOB_OPTIONS[QUEUE_NAMES.REPORT_GENERATE]);

        await waitForProspectStatus(prospectId, 'REPORT_READY', 3 * 60_000);

        steps[steps.length - 1].status = 'done';
        await updateSteps(steps);
      }
    }

    await prisma.workflowRun.update({
      where: { id: workflowRunId },
      data: { status: 'completed', completedAt: new Date(), steps: steps as never },
    });

    console.log(`Workflow ${workflowRunId} completed for prospect ${prospectId}`);

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    steps[steps.length - 1 < 0 ? 0 : steps.length - 1].status = 'failed';
    await prisma.workflowRun.update({
      where: { id: workflowRunId },
      data: { status: 'failed', errorMessage: errMsg, steps: steps as never },
    }).catch(() => {});
    throw err;
  }
}

async function waitForJob(queue: Queue, jobId: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await queue.getJob(jobId);
    if (!job) return;
    if (await job.isCompleted()) return;
    if (await job.isFailed()) throw new Error(`Job ${jobId} failed`);
    await sleep(2000);
  }
  throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
}

async function waitForProspectStatus(prospectId: string, targetStatus: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const p = await prisma.prospect.findUnique({ where: { id: prospectId }, select: { status: true } });
    if (p?.status === targetStatus) return;
    // Also check for terminal statuses that mean something went wrong
    if (p?.status === 'ARCHIVED' || p?.status === 'SUPPRESSED') {
      throw new Error(`Prospect reached unexpected status: ${p.status}`);
    }
    await sleep(3000);
  }
  throw new Error(`Prospect ${prospectId} did not reach ${targetStatus} within ${timeoutMs}ms`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
