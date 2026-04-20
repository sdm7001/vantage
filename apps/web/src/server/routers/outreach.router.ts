import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES, JOB_OPTIONS } from '@vantage/queue';
import { getEnv } from '@vantage/config';

function getRedis() {
  const env = getEnv();
  const isUpstash = env.UPSTASH_REDIS_URL.startsWith('rediss://');
  return new IORedis(env.UPSTASH_REDIS_URL, {
    ...(isUpstash && { password: env.UPSTASH_REDIS_TOKEN, tls: { rejectUnauthorized: true } }),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export const outreachRouter = router({
  getThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.outreachThread.findFirst({
        where: {
          id: input.threadId,
          prospect: { orgId: ctx.orgId },
        },
        include: {
          emails: {
            orderBy: { sequenceIndex: 'asc' },
            include: { events: { orderBy: { createdAt: 'asc' } } },
          },
          prospect: true,
          campaign: true,
        },
      });
    }),

  approveInitial: protectedProcedure
    .input(z.object({ prospectId: z.string(), campaignId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
        include: { contacts: { where: { isPrimary: true }, take: 1 }, reports: { where: { status: 'ready' }, take: 1 } },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });

      const contact = prospect.contacts[0];
      if (!contact?.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No primary contact with email' });

      if (!prospect.reports[0]) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No completed report — run audit and report generation first' });

      // Find or create thread — explicit findFirst avoids MySQL NULL unique index issues
      let thread = await ctx.prisma.outreachThread.findFirst({
        where: { prospectId: input.prospectId, campaignId: input.campaignId ?? null },
      });
      if (thread) {
        thread = await ctx.prisma.outreachThread.update({
          where: { id: thread.id },
          data: { state: 'APPROVED', approvedAt: new Date(), approvedBy: ctx.userId },
        });
      } else {
        thread = await ctx.prisma.outreachThread.create({
          data: {
            prospectId: input.prospectId,
            campaignId: input.campaignId ?? null,
            state: 'INITIAL_QUEUED',
            approvedAt: new Date(),
            approvedBy: ctx.userId,
          },
        });
      }

      // Create email record
      const emailRecord = await ctx.prisma.email.create({
        data: {
          threadId: thread.id,
          contactId: contact.id,
          sequenceIndex: 0,
          subject: '',
          htmlBody: '',
          fromName: '',
          fromEmail: '',
          status: 'queued',
        },
      });

      // Enqueue
      const redis = getRedis();
      const queue = new Queue(QUEUE_NAMES.OUTREACH_INITIAL, { connection: redis });
      await queue.add('send-initial', {
        orgId: ctx.orgId,
        prospectId: input.prospectId,
        contactId: contact.id,
        threadId: thread.id,
        emailId: emailRecord.id,
      }, JOB_OPTIONS[QUEUE_NAMES.OUTREACH_INITIAL]);

      await ctx.prisma.prospect.update({
        where: { id: input.prospectId },
        data: { status: 'OUTREACH_QUEUED' },
      });

      return { threadId: thread.id, emailId: emailRecord.id };
    }),

  getDailyStats: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10);
    const limit = await ctx.prisma.dailyEmailLimit.findUnique({
      where: { orgId_date: { orgId: ctx.orgId, date: today } },
    });
    const campaign = await ctx.prisma.campaign.findFirst({
      where: { orgId: ctx.orgId, status: 'active' },
      orderBy: { createdAt: 'asc' },
    });
    return {
      sent: limit?.newOutboundSent ?? 0,
      cap: campaign?.dailyNewLimit ?? 10,
      date: today,
    };
  }),

  pauseThread: protectedProcedure
    .input(z.object({ threadId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.prisma.outreachThread.findFirst({
        where: { id: input.threadId, prospect: { orgId: ctx.orgId } },
      });
      if (!thread) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.prisma.outreachThread.update({
        where: { id: input.threadId },
        data: { pausedAt: new Date(), pausedReason: input.reason, nextActionAt: null },
      });
    }),
});
