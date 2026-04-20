import { prisma } from '@vantage/database';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import CampaignActions from './CampaignActions';
import CampaignStatusButton from './CampaignStatusButton';

export default async function CampaignsPage() {
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const org = await prisma.organization.findFirst({ where: { clerkOrgId: orgId } });
  if (!org) return notFound();

  const campaigns = await prisma.campaign.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { threads: true } },
    },
  });

  // Pull aggregate stats for each campaign
  const campaignData = await Promise.all(
    campaigns.map(async (c: any) => {
      const [threadStats, emails] = await Promise.all([
        prisma.outreachThread.groupBy({
          by: ['state'],
          where: { campaignId: c.id },
          _count: { state: true },
        }),
        prisma.email.findMany({
          where: { thread: { campaignId: c.id }, status: 'sent' },
          select: { sequenceIndex: true, events: { select: { type: true } } },
        }),
      ]);

      const stateMap = Object.fromEntries(threadStats.map((s: any) => [s.state, s._count.state]));
      const activeStates = ['INITIAL_QUEUED', 'INITIAL_SENT', 'FOLLOWUP_1_QUEUED', 'FOLLOWUP_1_SENT',
        'FOLLOWUP_2_QUEUED', 'FOLLOWUP_2_SENT', 'FOLLOWUP_3_QUEUED', 'FOLLOWUP_3_SENT',
        'FOLLOWUP_4_QUEUED', 'FOLLOWUP_4_SENT', 'FOLLOWUP_5_QUEUED', 'FOLLOWUP_5_SENT'];
      const activeThreads = activeStates.reduce((sum, s) => sum + (stateMap[s] ?? 0), 0);

      const sent = emails.length;
      const opened = emails.filter((e: any) => (e.events as Array<{ type: string }>).some(ev => ev.type === 'opened')).length;
      const replied = emails.filter((e: any) => (e.events as Array<{ type: string }>).some(ev => ev.type === 'replied')).length;

      return {
        ...c,
        totalThreads: c._count.threads,
        activeThreads,
        sent,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      };
    })
  );

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      active: { bg: '#f0fdf4', color: '#16a34a' },
      paused: { bg: '#fefce8', color: '#ca8a04' },
      archived: { bg: '#f1f5f9', color: '#64748b' },
    };
    return map[status] ?? { bg: '#f1f5f9', color: '#64748b' };
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Campaigns</h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Group prospects into outreach campaigns with per-campaign daily limits.</p>
        </div>
        <CampaignActions />
      </div>

      {campaignData.length === 0 ? (
        <div style={{ background: 'white', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📣</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>No campaigns yet</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Create a campaign to group prospects and track outreach performance.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {campaignData.map(c => {
            const badge = statusBadge(c.status);
            return (
              <div key={c.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <Link href={`/campaigns/${c.id}`} style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: badge.bg, color: badge.color }}>
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '28px', fontSize: '12px', color: '#64748b' }}>
                      <span><strong style={{ color: '#0f172a' }}>{c.totalThreads}</strong> threads</span>
                      <span><strong style={{ color: '#1565C0' }}>{c.activeThreads}</strong> active</span>
                      <span><strong style={{ color: '#0f172a' }}>{c.sent}</strong> emails sent</span>
                      <span><strong style={{ color: c.openRate >= 30 ? '#16a34a' : '#d97706' }}>{c.openRate}%</strong> open rate</span>
                      <span><strong style={{ color: c.replyRate >= 5 ? '#16a34a' : '#d97706' }}>{c.replyRate}%</strong> reply rate</span>
                      <span style={{ color: '#94a3b8' }}>Cap: {c.dailyNewLimit}/day</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '20px' }}>
                    <Link href={`/campaigns/${c.id}`} style={{
                      padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      background: '#f1f5f9', color: '#475569', textDecoration: 'none',
                    }}>
                      View →
                    </Link>
                    <CampaignStatusButton campaignId={c.id} currentStatus={c.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

