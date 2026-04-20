import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@vantage/database';
import { ZodError } from 'zod';

export async function createContext() {
  const { userId, orgId: clerkOrgId } = await auth();
  return { userId, clerkOrgId, prisma };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.clerkOrgId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  // Resolve internal DB org ID — all tables use Organization.id (cuid), not clerkOrgId
  const org = await ctx.prisma.organization.findUnique({
    where: { clerkOrgId: ctx.clerkOrgId },
    select: { id: true },
  });
  if (!org) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Organization not found' });
  return next({ ctx: { ...ctx, userId: ctx.userId, orgId: org.id } });
});
