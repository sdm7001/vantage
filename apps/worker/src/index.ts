import { Worker, Queue } from 'bullmq';
import { QUEUE_NAMES } from '@vantage/queue';
import { getEnv } from '@vantage/config';
import { getRedis } from './lib/redis';
import { auditCrawlProcessor } from './processors/audit-crawl.processor';
import { auditEvaluateProcessor } from './processors/audit-evaluate.processor';
import { reportProcessor } from './processors/report.processor';
import { outreachInitialProcessor } from './processors/outreach-initial.processor';
import { outreachFollowupProcessor } from './processors/outreach-followup.processor';
import { workflowProcessor } from './processors/workflow.processor';
import { enrichProcessor } from './processors/enrich.processor';
import { sourceProcessor } from './processors/source.processor';
import { runFollowupScheduler } from './processors/followup-scheduler';

const env = getEnv(); // Validates env on startup — fails fast if missing vars

const redis = getRedis();
const concurrency = env.WORKER_CONCURRENCY;

function makeWorker<T>(queueName: string, processor: (data: T) => Promise<void>) {
  const worker = new Worker(
    queueName,
    async job => {
      console.log(`[${queueName}] Processing job ${job.id}`);
      await processor(job.data as T);
    },
    { connection: redis, concurrency }
  );

  worker.on('completed', job => console.log(`[${queueName}] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[${queueName}] Job ${job?.id} failed:`, err.message));

  return worker;
}

// Start all workers
const workers = [
  makeWorker(QUEUE_NAMES.PROSPECT_ENRICH, enrichProcessor),
  makeWorker(QUEUE_NAMES.PROSPECT_SOURCE, sourceProcessor),
  makeWorker(QUEUE_NAMES.AUDIT_CRAWL, auditCrawlProcessor),
  makeWorker(QUEUE_NAMES.AUDIT_EVALUATE, auditEvaluateProcessor),
  makeWorker(QUEUE_NAMES.REPORT_GENERATE, reportProcessor),
  makeWorker(QUEUE_NAMES.OUTREACH_INITIAL, outreachInitialProcessor),
  makeWorker(QUEUE_NAMES.OUTREACH_FOLLOWUP, outreachFollowupProcessor),
  makeWorker(QUEUE_NAMES.WORKFLOW_ORCHESTRATE, workflowProcessor),
];

// Follow-up scheduler: runs every 15 minutes
const schedulerQueue = new Queue('scheduler-cron', { connection: redis });
void schedulerQueue.add('followup-check', {}, {
  repeat: { pattern: '*/15 * * * *' }, // every 15 min
  jobId: 'followup-scheduler', // deduplication
});

const schedulerWorker = new Worker(
  'scheduler-cron',
  async () => {
    await runFollowupScheduler();
  },
  { connection: redis, concurrency: 1 }
);

console.log(`Vantage worker started (concurrency: ${concurrency})`);
console.log(`Queues: ${Object.values(QUEUE_NAMES).join(', ')}`);

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down workers...');
  await Promise.all([...workers, schedulerWorker].map(w => w.close()));
  await redis.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
