import { initTRPC, TRPCError } from '@trpc/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@vantage/database';
import { ZodError } from 'zod';

export async function createContext() {
  const { userId, orgId } = await auth();
  return { userId, orgId, prisma };
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
  if (!ctx.userId || !ctx.orgId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId, orgId: ctx.orgId } });
});
