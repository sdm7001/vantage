import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES, JOB_OPTIONS } from '@vantage/queue';
import { getEnv } from '@vantage/config';

function getRedis() {
  const env = getEnv();
  return new IORedis(env.UPSTASH_REDIS_URL, {
    password: env.UPSTASH_REDIS_TOKEN,
    tls: { rejectUnauthorized: true },
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export const prospectsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.prospect.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.status ? { status: input.status as never } : {}),
          ...(input.search ? {
            OR: [
              { companyName: { contains: input.search, mode: 'insensitive' } },
              { domain: { contains: input.search, mode: 'insensitive' } },
            ],
          } : {}),
          ...(input.cursor ? { id: { lt: input.cursor } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
          _count: { select: { audits: true, reports: true } },
        },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
        include: {
          contacts: true,
          audits: { orderBy: { createdAt: 'desc' }, take: 1 },
          reports: { orderBy: { createdAt: 'desc' }, take: 1 },
          briefs: { orderBy: { createdAt: 'desc' }, take: 1 },
          painPoints: { orderBy: { createdAt: 'desc' }, take: 1 },
          threads: { include: { emails: { include: { events: true } }, campaign: true } },
        },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });
      return prospect;
    }),

  create: protectedProcedure
    .input(z.object({
      domain: z.string().min(1),
      companyName: z.string().optional(),
      industry: z.string().optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const domain = input.domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
      return ctx.prisma.prospect.create({
        data: {
          orgId: ctx.orgId,
          domain,
          companyName: input.companyName,
          industry: input.industry,
          city: input.city,
          status: 'NEW',
        },
      });
    }),

  triggerAudit: protectedProcedure
    .input(z.object({ prospectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });

      const audit = await ctx.prisma.websiteAudit.create({
        data: {
          prospectId: prospect.id,
          domain: prospect.domain,
          triggeredBy: ctx.userId,
          status: 'pending',
        },
      });

      await ctx.prisma.prospect.update({
        where: { id: prospect.id },
        data: { status: 'AUDITING' },
      });

      const redis = getRedis();
      const queue = new Queue(QUEUE_NAMES.AUDIT_CRAWL, { connection: redis });
      await queue.add('crawl', {
        orgId: ctx.orgId,
        prospectId: prospect.id,
        auditId: audit.id,
        domain: prospect.domain,
      }, JOB_OPTIONS[QUEUE_NAMES.AUDIT_CRAWL]);

      return { auditId: audit.id };
    }),

  triggerFullPipeline: protectedProcedure
    .input(z.object({ prospectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });

      const workflowRun = await ctx.prisma.workflowRun.create({
        data: {
          orgId: ctx.orgId,
          prospectId: prospect.id,
          type: 'full_pipeline',
          status: 'running',
        },
      });

      const redis = getRedis();
      const queue = new Queue(QUEUE_NAMES.WORKFLOW_ORCHESTRATE, { connection: redis });
      await queue.add('workflow', {
        orgId: ctx.orgId,
        prospectId: prospect.id,
        workflowRunId: workflowRun.id,
        runEnrich: true,
        runAudit: true,
        runReport: true,
        runOutreach: false, // operator approves outreach manually
      }, JOB_OPTIONS[QUEUE_NAMES.WORKFLOW_ORCHESTRATE]);

      return { workflowRunId: workflowRun.id };
    }),

  suppress: protectedProcedure
    .input(z.object({ prospectId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
        include: { contacts: true },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });

      // Add email suppressions for all contacts
      for (const contact of prospect.contacts) {
        if (!contact.email) continue;
        await ctx.prisma.suppressionEntry.upsert({
          where: { orgId_type_value: { orgId: ctx.orgId, type: 'EMAIL', value: contact.email } },
          update: {},
          create: { orgId: ctx.orgId, type: 'EMAIL', value: contact.email, reason: input.reason },
        });
      }

      await ctx.prisma.prospect.update({
        where: { id: prospect.id },
        data: { status: 'SUPPRESSED' },
      });

      return { success: true };
    }),
});
