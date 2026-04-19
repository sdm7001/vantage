import { router } from './trpc';
import { prospectsRouter } from './routers/prospects.router';
import { outreachRouter } from './routers/outreach.router';
import { analyticsRouter } from './routers/analytics.router';
import { settingsRouter } from './routers/settings.router';

export const appRouter = router({
  prospects: prospectsRouter,
  outreach: outreachRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
