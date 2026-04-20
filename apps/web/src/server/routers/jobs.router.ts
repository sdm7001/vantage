import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const jobsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['running', 'completed', 'failed']).optional(),
      limit: z.number().min(1).max(100).default(40),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.workflowRun.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.status ? { status: input.status } : {}),
        },
        orderBy: { startedAt: 'desc' },
        take: input.limit,
        include: {
          prospect: { select: { id: true, companyName: true, domain: true } },
        },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const run = await ctx.prisma.workflowRun.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
        include: {
          prospect: { select: { id: true, companyName: true, domain: true, status: true } },
        },
      });
      if (!run) throw new TRPCError({ code: 'NOT_FOUND' });
      return run;
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [running, completed, failed, today] = await Promise.all([
      ctx.prisma.workflowRun.count({ where: { orgId: ctx.orgId, status: 'running' } }),
      ctx.prisma.workflowRun.count({ where: { orgId: ctx.orgId, status: 'completed' } }),
      ctx.prisma.workflowRun.count({ where: { orgId: ctx.orgId, status: 'failed' } }),
      ctx.prisma.workflowRun.count({
        where: {
          orgId: ctx.orgId,
          startedAt: { gte: new Date(new Date().toISOString().slice(0, 10)) },
        },
      }),
    ]);
    return { running, completed, failed, today };
  }),
});
