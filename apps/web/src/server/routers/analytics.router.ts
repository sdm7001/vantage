import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const analyticsRouter = router({
  getDashboardMetrics: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().slice(0, 10);

    const [
      totalProspects,
      auditsCompleted,
      reportsGenerated,
      dailyLimit,
      activeCampaign,
      threadsWithReply,
      totalThreads,
      conversions,
    ] = await Promise.all([
      ctx.prisma.prospect.count({ where: { orgId: ctx.orgId } }),
      ctx.prisma.websiteAudit.count({ where: { prospect: { orgId: ctx.orgId }, status: 'completed' } }),
      ctx.prisma.prospectReport.count({ where: { prospect: { orgId: ctx.orgId }, status: 'ready' } }),
      ctx.prisma.dailyEmailLimit.findUnique({ where: { orgId_date: { orgId: ctx.orgId, date: today } } }),
      ctx.prisma.campaign.findFirst({ where: { orgId: ctx.orgId, status: 'active' }, orderBy: { createdAt: 'asc' } }),
      ctx.prisma.outreachThread.count({ where: { prospect: { orgId: ctx.orgId }, state: 'REPLIED' } }),
      ctx.prisma.outreachThread.count({ where: { prospect: { orgId: ctx.orgId }, state: { not: 'PENDING' } } }),
      ctx.prisma.prospect.count({ where: { orgId: ctx.orgId, status: 'CONVERTED' } }),
    ]);

    return {
      totalProspects,
      auditsCompleted,
      reportsGenerated,
      emailsToday: dailyLimit?.newOutboundSent ?? 0,
      emailCap: activeCampaign?.dailyNewLimit ?? 10,
      replyRate: totalThreads > 0 ? Math.round((threadsWithReply / totalThreads) * 100) : 0,
      conversions,
    };
  }),

  getFunnelData: protectedProcedure.query(async ({ ctx }) => {
    const stages = [
      { label: 'Discovered', statuses: ['NEW', 'ENRICHING', 'ENRICHED', 'AUDITING', 'AUDITED', 'REPORT_GENERATING', 'REPORT_READY', 'OUTREACH_QUEUED', 'OUTREACH_SENT', 'ENGAGED', 'CONVERTED'] },
      { label: 'Enriched', statuses: ['ENRICHED', 'AUDITING', 'AUDITED', 'REPORT_GENERATING', 'REPORT_READY', 'OUTREACH_QUEUED', 'OUTREACH_SENT', 'ENGAGED', 'CONVERTED'] },
      { label: 'Audited', statuses: ['AUDITED', 'REPORT_GENERATING', 'REPORT_READY', 'OUTREACH_QUEUED', 'OUTREACH_SENT', 'ENGAGED', 'CONVERTED'] },
      { label: 'Report Ready', statuses: ['REPORT_READY', 'OUTREACH_QUEUED', 'OUTREACH_SENT', 'ENGAGED', 'CONVERTED'] },
      { label: 'Outreach Sent', statuses: ['OUTREACH_SENT', 'ENGAGED', 'CONVERTED'] },
      { label: 'Opened / Clicked', statuses: ['ENGAGED', 'CONVERTED'] },
      { label: 'Replied', statuses: ['CONVERTED'] },
      { label: 'Converted', statuses: ['CONVERTED'] },
    ];

    const counts = await Promise.all(
      stages.map(s =>
        ctx.prisma.prospect.count({
          where: { orgId: ctx.orgId, status: { in: s.statuses as never[] } },
        })
      )
    );

    return stages.map((s, i) => ({ label: s.label, count: counts[i] }));
  }),

  getEmailPerformance: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 86400000);

      const emails = await ctx.prisma.email.findMany({
        where: {
          thread: { prospect: { orgId: ctx.orgId } },
          sentAt: { gte: since },
          status: 'sent',
        },
        include: { events: true },
      });

      const bySequence: Record<number, { sent: number; opens: number; clicks: number; replies: number }> = {};

      for (const email of emails) {
        const idx = email.sequenceIndex;
        if (!bySequence[idx]) bySequence[idx] = { sent: 0, opens: 0, clicks: 0, replies: 0 };
        bySequence[idx].sent++;
        if (email.events.some((e: { type: string }) => e.type === 'opened')) bySequence[idx].opens++;
        if (email.events.some((e: { type: string }) => e.type === 'clicked')) bySequence[idx].clicks++;
        if (email.events.some((e: { type: string }) => e.type === 'replied')) bySequence[idx].replies++;
      }

      return Object.entries(bySequence)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([seq, stats]) => ({
          sequence: Number(seq),
          label: Number(seq) === 0 ? 'Initial' : `Follow-up ${seq}`,
          ...stats,
          openRate: stats.sent > 0 ? Math.round((stats.opens / stats.sent) * 100) : 0,
          replyRate: stats.sent > 0 ? Math.round((stats.replies / stats.sent) * 100) : 0,
        }));
    }),

  getAuditScoreDistribution: protectedProcedure.query(async ({ ctx }) => {
    const audits = await ctx.prisma.websiteAudit.findMany({
      where: { prospect: { orgId: ctx.orgId }, status: 'completed', overallScore: { not: null } },
      select: { overallScore: true },
    });

    const buckets = [
      { label: '0–29 Critical', min: 0, max: 29, count: 0, color: '#dc2626' },
      { label: '30–44 Poor', min: 30, max: 44, count: 0, color: '#f97316' },
      { label: '45–69 Needs Work', min: 45, max: 69, count: 0, color: '#d97706' },
      { label: '70–84 Good', min: 70, max: 84, count: 0, color: '#65a30d' },
      { label: '85–100 Strong', min: 85, max: 100, count: 0, color: '#16a34a' },
    ];

    for (const { overallScore } of audits) {
      if (overallScore == null) continue;
      const bucket = buckets.find(b => overallScore >= b.min && overallScore <= b.max);
      if (bucket) bucket.count++;
    }

    return buckets;
  }),

  getTopFindings: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const recs = await ctx.prisma.auditRecommendation.groupBy({
        by: ['title', 'priority'],
        where: { audit: { prospect: { orgId: ctx.orgId } }, priority: 'P0' },
        _count: { title: true },
        orderBy: { _count: { title: 'desc' } },
        take: input.limit,
      });

      return recs.map((r: { title: string; priority: string; _count: { title: number } }) => ({ title: r.title, priority: r.priority, count: r._count.title }));
    }),
});
