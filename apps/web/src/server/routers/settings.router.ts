import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const settingsRouter = router({
  getBrandConfig: protectedProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findFirst({ where: { clerkOrgId: ctx.orgId } });
    if (!org) return null;
    return ctx.prisma.brandConfig.findUnique({ where: { orgId: org.id } });
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
      const org = await ctx.prisma.organization.findFirst({ where: { clerkOrgId: ctx.orgId } });
      if (!org) throw new Error('Organization not found');

      return ctx.prisma.brandConfig.upsert({
        where: { orgId: org.id },
        update: {
          companyName: input.companyName,
          primaryColor: input.primaryColor,
          accentColor: input.accentColor,
          senderName: input.senderName,
          senderEmail: input.senderEmail,
          bookingUrl: input.bookingUrl || null,
        },
        create: {
          orgId: org.id,
          companyName: input.companyName,
          primaryColor: input.primaryColor,
          accentColor: input.accentColor,
          senderName: input.senderName,
          senderEmail: input.senderEmail,
          bookingUrl: input.bookingUrl || null,
        },
      });
    }),
});
