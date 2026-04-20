import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { getEnv } from '@vantage/config';

export const settingsRouter = router({
  getBrandConfig: protectedProcedure.query(async ({ ctx }) => {
    const config = await ctx.prisma.brandConfig.findUnique({ where: { orgId: ctx.orgId } });
    if (!config) return null;
    // Prefer direct logoUrl (base64 data URL); fall back to R2 if configured
    const env = getEnv();
    const logoUrl = config.logoUrl ?? (config.logoR2Key ? `${env.R2_PUBLIC_URL}/${config.logoR2Key}` : null);
    return { ...config, logoUrl };
  }),

  updateBrandConfig: protectedProcedure
    .input(z.object({
      companyName: z.string().min(1).max(100),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      senderName: z.string().min(1).max(100),
      senderEmail: z.string().email(),
      bookingUrl: z.string().url().optional().or(z.literal('')),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.brandConfig.upsert({
        where: { orgId: ctx.orgId },
        update: {
          companyName: input.companyName,
          primaryColor: input.primaryColor,
          accentColor: input.accentColor,
          senderName: input.senderName,
          senderEmail: input.senderEmail,
          bookingUrl: input.bookingUrl || null,
        },
        create: {
          orgId: ctx.orgId,
          companyName: input.companyName,
          primaryColor: input.primaryColor,
          accentColor: input.accentColor,
          senderName: input.senderName,
          senderEmail: input.senderEmail,
          bookingUrl: input.bookingUrl || null,
        },
      });
    }),

  getSuppressions: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.suppressionEntry.findMany({
        where: { orgId: ctx.orgId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
    }),

  removeSuppression: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.suppressionEntry.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
      });
      if (!entry) throw new TRPCError({ code: 'NOT_FOUND' });
      await ctx.prisma.suppressionEntry.delete({ where: { id: input.id } });
      return { success: true };
    }),

  addSuppression: protectedProcedure
    .input(z.object({
      value: z.string().min(1).max(320),
      type: z.enum(['EMAIL', 'DOMAIN']),
      reason: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.suppressionEntry.upsert({
        where: { orgId_type_value: { orgId: ctx.orgId, type: input.type, value: input.value.toLowerCase() } },
        update: {},
        create: { orgId: ctx.orgId, type: input.type, value: input.value.toLowerCase(), reason: input.reason ?? 'manually added' },
      });
    }),
});
