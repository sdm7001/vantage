import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_OPTIONS } from '@vantage/queue';
import { getRedis } from '../lib/redis';

export const sourcingRouter = router({
  getProfiles: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.icpProfile.findMany({
      where: { orgId: ctx.orgId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }),

  createProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(191),
      industries: z.array(z.string()).min(1),
      cities: z.array(z.string()).default([]),
      states: z.array(z.string()).default([]),
      keywords: z.array(z.string()).default([]),
      minEmployees: z.number().int().min(1).optional(),
      maxEmployees: z.number().int().min(1).optional(),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.isDefault) {
        await ctx.prisma.icpProfile.updateMany({
          where: { orgId: ctx.orgId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return ctx.prisma.icpProfile.create({
        data: {
          orgId: ctx.orgId,
          name: input.name,
          industries: input.industries,
          cities: input.cities,
          states: input.states,
          keywords: input.keywords,
          minEmployees: input.minEmployees,
          maxEmployees: input.maxEmployees,
          isDefault: input.isDefault,
        },
      });
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(191),
      industries: z.array(z.string()).min(1),
      cities: z.array(z.string()).default([]),
      states: z.array(z.string()).default([]),
      keywords: z.array(z.string()).default([]),
      minEmployees: z.number().int().min(1).optional(),
      maxEmployees: z.number().int().min(1).optional(),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.icpProfile.findFirst({ where: { id: input.id, orgId: ctx.orgId } });
      if (!profile) throw new TRPCError({ code: 'NOT_FOUND' });
      if (input.isDefault) {
        await ctx.prisma.icpProfile.updateMany({
          where: { orgId: ctx.orgId, isDefault: true, id: { not: input.id } },
          data: { isDefault: false },
        });
      }
      return ctx.prisma.icpProfile.update({
        where: { id: input.id },
        data: {
          name: input.name,
          industries: input.industries,
          cities: input.cities,
          states: input.states,
          keywords: input.keywords,
          minEmployees: input.minEmployees ?? null,
          maxEmployees: input.maxEmployees ?? null,
          isDefault: input.isDefault,
        },
      });
    }),

  deleteProfile: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.icpProfile.deleteMany({ where: { id: input.id, orgId: ctx.orgId } });
      return { success: true };
    }),

  triggerSourcing: protectedProcedure
    .input(z.object({ icpProfileId: z.string(), limit: z.number().int().min(1).max(100).default(20) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.prisma.icpProfile.findFirst({
        where: { id: input.icpProfileId, orgId: ctx.orgId },
      });
      if (!profile) throw new TRPCError({ code: 'NOT_FOUND' });

      const redis = getRedis();
      const queue = new Queue(QUEUE_NAMES.PROSPECT_SOURCE, { connection: redis });
      await queue.add('source', {
        orgId: ctx.orgId,
        icpProfileId: input.icpProfileId,
        limit: input.limit,
      }, JOB_OPTIONS[QUEUE_NAMES.PROSPECT_SOURCE]);

      return { queued: true };
    }),
});
