import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const campaignsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const campaigns = await ctx.prisma.campaign.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { threads: true } },
      },
    });

    // For each campaign, pull aggregate email stats
    const withStats = await Promise.all(
      campaigns.map(async (c: any) => {
        const threads = await ctx.prisma.outreachThread.findMany({
          where: { campaignId: c.id },
          select: { state: true },
        });
        const emails = await ctx.prisma.email.findMany({
          where: { thread: { campaignId: c.id }, status: 'sent' },
          select: { events: { select: { type: true } } },
        });

        const sent = emails.length;
        const opened = emails.filter((e: any) => e.events.some((ev: { type: string }) => ev.type === 'opened')).length;
        const replied = emails.filter((e: any) => e.events.some((ev: { type: string }) => ev.type === 'replied')).length;
        const active = threads.filter((t: any) => !['COMPLETED', 'REPLIED', 'OPTED_OUT', 'BOUNCED', 'SUPPRESSED'].includes(t.state)).length;

        return {
          ...c,
          stats: {
            threads: threads.length,
            active,
            sent,
            openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
            replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
          },
        };
      })
    );

    return withStats;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.prisma.campaign.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
        include: {
          threads: {
            include: {
              prospect: { select: { id: true, companyName: true, domain: true, status: true } },
              emails: {
                where: { status: 'sent' },
                select: { sequenceIndex: true, sentAt: true, events: { select: { type: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND' });
      return campaign;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(191),
      dailyNewLimit: z.number().int().min(1).max(50).default(10),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.campaign.create({
        data: {
          orgId: ctx.orgId,
          name: input.name,
          dailyNewLimit: input.dailyNewLimit,
          status: 'active',
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(191).optional(),
      dailyNewLimit: z.number().int().min(1).max(50).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.prisma.campaign.findFirst({ where: { id: input.id, orgId: ctx.orgId } });
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.prisma.campaign.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.dailyNewLimit !== undefined && { dailyNewLimit: input.dailyNewLimit }),
        },
      });
    }),

  setStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['active', 'paused', 'archived']),
    }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.prisma.campaign.findFirst({ where: { id: input.id, orgId: ctx.orgId } });
      if (!campaign) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.prisma.campaign.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
