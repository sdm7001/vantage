import { router } from './trpc';
import { prospectsRouter } from './routers/prospects.router';
import { outreachRouter } from './routers/outreach.router';
import { analyticsRouter } from './routers/analytics.router';
import { settingsRouter } from './routers/settings.router';
import { campaignsRouter } from './routers/campaigns.router';
import { jobsRouter } from './routers/jobs.router';
import { sourcingRouter } from './routers/sourcing.router';
import { reportsRouter } from './routers/reports.router';

export const appRouter = router({
  prospects: prospectsRouter,
  reports: reportsRouter,
  outreach: outreachRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
  campaigns: campaignsRouter,
  jobs: jobsRouter,
  sourcing: sourcingRouter,
});

export type AppRouter = typeof appRouter;
