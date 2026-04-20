import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_OPTIONS } from '@vantage/queue';
import { getRedis } from '../lib/redis';

export const reportsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['ready', 'generating']).optional(),
      limit: z.number().min(1).max(100).default(60),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.prospectReport.findMany({
        where: {
          prospect: { orgId: ctx.orgId },
          ...(input.status ? { status: input.status } : {}),
          ...(input.cursor ? { id: { lt: input.cursor } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          prospect: { select: { id: true, companyName: true, domain: true, status: true } },
          audit: { select: { overallScore: true } },
        },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.prisma.prospectReport.findFirst({
        where: { id: input.id, prospect: { orgId: ctx.orgId } },
        include: {
          prospect: {
            select: { id: true, companyName: true, domain: true, status: true },
          },
          audit: { select: { overallScore: true, evaluatedAt: true } },
        },
      });
      if (!report) throw new TRPCError({ code: 'NOT_FOUND' });
      return report;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.prisma.prospectReport.findFirst({
        where: { id: input.id, prospect: { orgId: ctx.orgId } },
      });
      if (!report) throw new TRPCError({ code: 'NOT_FOUND' });
      await ctx.prisma.prospectReport.delete({ where: { id: input.id } });
      return { success: true };
    }),

  regenerate: protectedProcedure
    .input(z.object({ prospectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
        include: {
          audits: {
            where: { status: 'completed' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });
      const audit = prospect.audits[0];
      if (!audit) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No completed audit — run an audit first' });

      const report = await ctx.prisma.prospectReport.create({
        data: {
          prospectId: input.prospectId,
          auditId: audit.id,
          status: 'generating',
        },
      });

      await ctx.prisma.prospect.update({
        where: { id: input.prospectId },
        data: { status: 'REPORT_GENERATING' },
      });

      const redis = getRedis();
      const queue = new Queue(QUEUE_NAMES.REPORT_GENERATE, { connection: redis });
      await queue.add('generate', {
        orgId: ctx.orgId,
        prospectId: input.prospectId,
        auditId: audit.id,
        reportId: report.id,
      }, JOB_OPTIONS[QUEUE_NAMES.REPORT_GENERATE]);

      return { reportId: report.id };
    }),
});
