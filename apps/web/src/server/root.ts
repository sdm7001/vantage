import { router } from './trpc';
import { prospectsRouter } from './routers/prospects.router';
import { outreachRouter } from './routers/outreach.router';

export const appRouter = router({
  prospects: prospectsRouter,
  outreach: outreachRouter,
});

export type AppRouter = typeof appRouter;
