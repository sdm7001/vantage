// Typed BullMQ job definitions for Vantage

export type ProspectEnrichJobData = {
  orgId: string;
  prospectId: string;
  workflowRunId?: string;
};

export type AuditCrawlJobData = {
  orgId: string;
  prospectId: string;
  auditId: string;
  domain: string;
  workflowRunId?: string;
};

export type AuditEvaluateJobData = {
  orgId: string;
  prospectId: string;
  auditId: string;
  workflowRunId?: string;
};

export type ReportGenerateJobData = {
  orgId: string;
  prospectId: string;
  auditId: string;
  reportId: string;
  workflowRunId?: string;
};

export type OutreachInitialJobData = {
  orgId: string;
  prospectId: string;
  contactId: string;
  threadId: string;
  emailId: string;
  workflowRunId?: string;
};

export type OutreachFollowupJobData = {
  orgId: string;
  prospectId: string;
  contactId: string;
  threadId: string;
  emailId: string;
  sequenceIndex: number; // 1-4
};

export type WorkflowRunJobData = {
  orgId: string;
  prospectId: string;
  workflowRunId: string;
  // Which stages to run
  runEnrich: boolean;
  runAudit: boolean;
  runReport: boolean;
  runOutreach: boolean;
};

// Queue names
export const QUEUE_NAMES = {
  PROSPECT_ENRICH: 'prospect-enrichment',
  AUDIT_CRAWL: 'audit-crawl',
  AUDIT_EVALUATE: 'audit-evaluate',
  REPORT_GENERATE: 'report-generate',
  OUTREACH_INITIAL: 'outreach-initial',
  OUTREACH_FOLLOWUP: 'outreach-followup',
  WORKFLOW_ORCHESTRATE: 'workflow-orchestrate',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job type map for type-safe worker registration
export type JobDataMap = {
  [QUEUE_NAMES.PROSPECT_ENRICH]: ProspectEnrichJobData;
  [QUEUE_NAMES.AUDIT_CRAWL]: AuditCrawlJobData;
  [QUEUE_NAMES.AUDIT_EVALUATE]: AuditEvaluateJobData;
  [QUEUE_NAMES.REPORT_GENERATE]: ReportGenerateJobData;
  [QUEUE_NAMES.OUTREACH_INITIAL]: OutreachInitialJobData;
  [QUEUE_NAMES.OUTREACH_FOLLOWUP]: OutreachFollowupJobData;
  [QUEUE_NAMES.WORKFLOW_ORCHESTRATE]: WorkflowRunJobData;
};

// Default job options per queue
export const JOB_OPTIONS = {
  [QUEUE_NAMES.PROSPECT_ENRICH]: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, timeout: 60_000 },
  [QUEUE_NAMES.AUDIT_CRAWL]: { attempts: 2, backoff: { type: 'exponential', delay: 10_000 }, timeout: 120_000 },
  [QUEUE_NAMES.AUDIT_EVALUATE]: { attempts: 2, backoff: { type: 'exponential', delay: 10_000 }, timeout: 180_000 },
  [QUEUE_NAMES.REPORT_GENERATE]: { attempts: 2, backoff: { type: 'exponential', delay: 10_000 }, timeout: 120_000 },
  [QUEUE_NAMES.OUTREACH_INITIAL]: { attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, timeout: 30_000 },
  [QUEUE_NAMES.OUTREACH_FOLLOWUP]: { attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, timeout: 30_000 },
  [QUEUE_NAMES.WORKFLOW_ORCHESTRATE]: { attempts: 1, timeout: 600_000 },
} as const;
