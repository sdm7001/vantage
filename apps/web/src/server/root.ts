import { router } from './trpc';
import { prospectsRouter } from './routers/prospects.router';
import { outreachRouter } from './routers/outreach.router';
import { analyticsRouter } from './routers/analytics.router';

export const appRouter = router({
  prospects: prospectsRouter,
  outreach: outreachRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
