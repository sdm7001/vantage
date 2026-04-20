import { prisma } from '@vantage/database';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';

export default async function AnalyticsPage() {
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const org = await prisma.organization.findFirst({ where: { clerkOrgId: orgId } });
  if (!org) return notFound();

  const today = new Date().toISOString().slice(0, 10);

  const [
    totalProspects,
    auditsCompleted,
    reportsGenerated,
    dailyLimit,
    activeCampaign,
    threadsReplied,
    totalThreadsSent,
    conversions,
    recentProspects,
    auditScores,
    emailStats,
    topFindings,
  ] = await Promise.all([
    prisma.prospect.count({ where: { orgId: org.id } }),
    prisma.websiteAudit.count({ where: { prospect: { orgId: org.id }, status: 'completed' } }),
    prisma.prospectReport.count({ where: { prospect: { orgId: org.id }, status: 'ready' } }),
    prisma.dailyEmailLimit.findUnique({ where: { orgId_date: { orgId: org.id, date: today } } }),
    prisma.campaign.findFirst({ where: { orgId: org.id, status: 'active' }, orderBy: { createdAt: 'asc' } }),
    prisma.outreachThread.count({ where: { prospect: { orgId: org.id }, state: 'REPLIED' } }),
    prisma.outreachThread.count({ where: { prospect: { orgId: org.id }, state: { not: 'PENDING' } } }),
    prisma.prospect.count({ where: { orgId: org.id, status: 'CONVERTED' } }),

    // Recent activity
    prisma.prospect.findMany({
      where: { orgId: org.id },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: { id: true, companyName: true, domain: true, status: true, updatedAt: true },
    }),

    // Audit score buckets
    prisma.websiteAudit.findMany({
      where: { prospect: { orgId: org.id }, status: 'completed', overallScore: { not: null } },
      select: { overallScore: true },
    }),

    // Email performance by sequence
    prisma.email.findMany({
      where: {
        thread: { prospect: { orgId: org.id } },
        status: 'sent',
        sentAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      select: { sequenceIndex: true, events: { select: { type: true } } },
    }),

    // Top P0 findings
    prisma.auditRecommendation.groupBy({
      by: ['title'],
      where: { audit: { prospect: { orgId: org.id } }, priority: 'P0' },
      _count: { title: true },
      orderBy: { _count: { title: 'desc' } },
      take: 8,
    }),
  ]);

  const emailCap = activeCampaign?.dailyNewLimit ?? 10;
  const emailsToday = dailyLimit?.newOutboundSent ?? 0;
  const replyRate = totalThreadsSent > 0 ? Math.round((threadsReplied / totalThreadsSent) * 100) : 0;

  // Build score buckets
  const scoreBuckets = [
    { label: '0–44 Critical', min: 0, max: 44, count: 0, color: '#dc2626' },
    { label: '45–69 Needs Work', min: 45, max: 69, count: 0, color: '#d97706' },
    { label: '70–84 Good', min: 70, max: 84, count: 0, color: '#65a30d' },
    { label: '85–100 Strong', min: 85, max: 100, count: 0, color: '#16a34a' },
  ];
  for (const { overallScore } of auditScores) {
    if (overallScore == null) continue;
    const b = scoreBuckets.find(b => overallScore >= b.min && overallScore <= b.max);
    if (b) b.count++;
  }
  const maxBucket = Math.max(...scoreBuckets.map(b => b.count), 1);

  // Build email performance table
  const perfBySeq: Record<number, { sent: number; opens: number; replies: number }> = {};
  for (const email of emailStats) {
    const idx = email.sequenceIndex;
    if (!perfBySeq[idx]) perfBySeq[idx] = { sent: 0, opens: 0, replies: 0 };
    perfBySeq[idx].sent++;
    if ((email.events as Array<{ type: string }>).some(e => e.type === 'opened')) perfBySeq[idx].opens++;
    if ((email.events as Array<{ type: string }>).some(e => e.type === 'replied')) perfBySeq[idx].replies++;
  }
  const emailPerf = Object.entries(perfBySeq)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([seq, s]) => ({
      label: Number(seq) === 0 ? 'Initial' : `Follow-up ${seq}`,
      sent: s.sent,
      openRate: s.sent > 0 ? Math.round((s.opens / s.sent) * 100) : 0,
      replyRate: s.sent > 0 ? Math.round((s.replies / s.sent) * 100) : 0,
    }));

  // Funnel stages
  const funnelCounts = [
    totalProspects,
    await prisma.prospect.count({ where: { orgId: org.id, status: { in: ['ENRICHED', 'AUDITING', 'AUDITED', 'REPORT_GENERATING', 'REPORT_READY', 'OUTREACH_QUEUED', 'OUTREACH_SENT', 'ENGAGED', 'CONVERTED'] as never[] } } }),
    auditsCompleted,
    reportsGenerated,
    await prisma.outreachThread.count({ where: { prospect: { orgId: org.id }, state: { in: ['INITIAL_SENT', 'FOLLOWUP_1_QUEUED', 'FOLLOWUP_1_SENT', 'FOLLOWUP_2_QUEUED', 'FOLLOWUP_2_SENT', 'FOLLOWUP_3_QUEUED', 'FOLLOWUP_3_SENT', 'FOLLOWUP_4_QUEUED', 'FOLLOWUP_4_SENT', 'REPLIED', 'COMPLETED'] as never[] } } }),
    threadsReplied,
    conversions,
  ];
  const funnelLabels = ['Discovered', 'Enriched', 'Audited', 'Report Ready', 'Outreach Sent', 'Replied', 'Converted'];
  const funnelMax = Math.max(...funnelCounts, 1);

  const statusColors: Record<string, string> = {
    NEW: '#94a3b8', ENRICHING: '#3b82f6', ENRICHED: '#6366f1',
    AUDITING: '#f59e0b', AUDITED: '#f97316',
    REPORT_GENERATING: '#8b5cf6', REPORT_READY: '#10b981',
    OUTREACH_QUEUED: '#06b6d4', OUTREACH_SENT: '#0ea5e9',
    ENGAGED: '#84cc16', CONVERTED: '#16a34a',
    SUPPRESSED: '#6b7280', ARCHIVED: '#94a3b8',
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' }}>Analytics</h1>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Prospects', value: totalProspects, sub: null, color: '#3b82f6' },
          { label: 'Audits Completed', value: auditsCompleted, sub: null, color: '#7c3aed' },
          { label: 'Reports Generated', value: reportsGenerated, sub: null, color: '#0891b2' },
          { label: 'Emails Today', value: `${emailsToday}/${emailCap}`, sub: `${replyRate}% reply rate`, color: emailsToday >= emailCap ? '#dc2626' : '#16a34a' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: card.color }}>{card.value}</div>
            {card.sub && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{card.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Funnel */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Pipeline Funnel</h2>
          {funnelLabels.map((label, i) => (
            <div key={label} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                <span style={{ color: '#475569' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{funnelCounts[i]}</span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px' }}>
                <div style={{
                  background: `hsl(${220 - i * 20}, 80%, 55%)`,
                  width: `${Math.round((funnelCounts[i] / funnelMax) * 100)}%`,
                  height: '100%',
                  borderRadius: '4px',
                  minWidth: funnelCounts[i] > 0 ? '4px' : '0',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Audit score distribution */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Audit Score Distribution</h2>
          {auditScores.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>No completed audits yet</div>
          ) : (
            scoreBuckets.map(b => (
              <div key={b.label} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: '#475569' }}>{b.label}</span>
                  <span style={{ fontWeight: 600, color: b.color }}>{b.count}</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '10px' }}>
                  <div style={{
                    background: b.color,
                    width: `${Math.round((b.count / maxBucket) * 100)}%`,
                    height: '100%',
                    borderRadius: '4px',
                    minWidth: b.count > 0 ? '4px' : '0',
                  }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Email performance */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Email Performance (30d)</h2>
          {emailPerf.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>No emails sent yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ color: '#94a3b8' }}>
                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>Sequence</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Sent</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Open %</th>
                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Reply %</th>
                </tr>
              </thead>
              <tbody>
                {emailPerf.map(row => (
                  <tr key={row.label} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#334155' }}>{row.label}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#334155' }}>{row.sent}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: row.openRate >= 30 ? '#16a34a' : '#d97706' }}>{row.openRate}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: row.replyRate >= 5 ? '#16a34a' : '#d97706' }}>{row.replyRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top P0 findings */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Top P0 Findings</h2>
          {topFindings.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>No P0 findings yet</div>
          ) : (
            topFindings.map((f: { title: string; _count: { title: number } }) => (
              <div key={f.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '12px', color: '#334155', flex: 1, marginRight: '12px' }}>{f.title}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                  {f._count.title}× found
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Recent Activity</h2>
        {recentProspects.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>No prospects yet</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {recentProspects.map((p: { id: string; companyName: string | null; domain: string; status: string; updatedAt: Date }) => (
              <a key={p.id} href={`/prospects/${p.id}`} style={{ textDecoration: 'none', display: 'block', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.companyName ?? p.domain}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '6px' }}>{p.domain}</div>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: `${statusColors[p.status] ?? '#94a3b8'}20`,
                  color: statusColors[p.status] ?? '#94a3b8',
                }}>
                  {p.status}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
