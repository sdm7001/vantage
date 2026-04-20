import { prisma } from '@vantage/database';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import CampaignEditButton from './CampaignEditButton';
import CampaignStatusButton from '../CampaignStatusButton';

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const org = await prisma.organization.findFirst({ where: { clerkOrgId: orgId } });
  if (!org) return notFound();

  const campaign = await prisma.campaign.findFirst({
    where: { id, orgId: org.id },
    include: {
      threads: {
        include: {
          prospect: { select: { id: true, companyName: true, domain: true, status: true } },
          emails: {
            where: { status: 'sent' },
            select: { sequenceIndex: true, sentAt: true, events: { select: { type: true } } },
            orderBy: { sequenceIndex: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  });
  if (!campaign) return notFound();

  type CampaignEmail = { sequenceIndex: number; sentAt: Date | null; events: Array<{ type: string }> };
  type CampaignThread = {
    id: string; state: string; createdAt: Date;
    prospect: { id: string; companyName: string | null; domain: string; status: string } | null;
    emails: CampaignEmail[];
  };

  const threads = campaign.threads as CampaignThread[];

  const allEmails = threads.flatMap(t => t.emails);
  const sent = allEmails.length;
  const opened = allEmails.filter(e => e.events.some(ev => ev.type === 'opened')).length;
  const replied = allEmails.filter(e => e.events.some(ev => ev.type === 'replied')).length;
  const active = threads.filter(t =>
    !['COMPLETED', 'REPLIED', 'OPTED_OUT', 'BOUNCED', 'SUPPRESSED'].includes(t.state)
  ).length;

  const statusBadge = (state: string) => {
    if (state === 'REPLIED') return { bg: '#f0fdf4', color: '#16a34a', label: 'Replied' };
    if (state === 'COMPLETED') return { bg: '#f1f5f9', color: '#64748b', label: 'Completed' };
    if (['BOUNCED', 'OPTED_OUT', 'SUPPRESSED'].includes(state)) return { bg: '#fef2f2', color: '#b91c1c', label: state.toLowerCase() };
    if (state.includes('SENT')) return { bg: '#eff6ff', color: '#1d4ed8', label: 'Sent' };
    if (state.includes('QUEUED')) return { bg: '#fefce8', color: '#ca8a04', label: 'Queued' };
    return { bg: '#f1f5f9', color: '#64748b', label: state.toLowerCase() };
  };

  const campaignStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      active: { bg: '#f0fdf4', color: '#16a34a' },
      paused: { bg: '#fefce8', color: '#ca8a04' },
      archived: { bg: '#f1f5f9', color: '#64748b' },
    };
    return map[status] ?? { bg: '#f1f5f9', color: '#64748b' };
  };

  const badge = campaignStatusBadge(campaign.status);

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Link href="/campaigns" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>
            ← Campaigns
          </Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {campaign.name}
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px',
                background: badge.bg,
                color: badge.color,
                textTransform: 'uppercase',
              }}>
                {campaign.status}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Cap: {campaign.dailyNewLimit} initial emails/day
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CampaignStatusButton campaignId={campaign.id} currentStatus={campaign.status} />
            <CampaignEditButton
              campaignId={campaign.id}
              currentName={campaign.name}
              currentLimit={campaign.dailyNewLimit}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Threads', value: threads.length, color: '#0f172a' },
          { label: 'Active', value: active, color: '#1565C0' },
          { label: 'Emails Sent', value: sent, color: '#0f172a' },
          { label: 'Open Rate', value: sent > 0 ? `${Math.round((opened / sent) * 100)}%` : '—', color: opened / (sent || 1) >= 0.3 ? '#16a34a' : '#d97706' },
          { label: 'Reply Rate', value: sent > 0 ? `${Math.round((replied / sent) * 100)}%` : '—', color: replied / (sent || 1) >= 0.05 ? '#16a34a' : '#d97706' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 18px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Thread list */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
        Outreach Threads ({threads.length})
      </h2>

      {threads.length === 0 ? (
        <div style={{ background: 'white', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>No threads yet. Add prospects to this campaign to start outreach.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {threads.map(thread => {
            const emails = thread.emails;
            const threadOpened = emails.some(e => e.events.some(ev => ev.type === 'opened'));
            const threadReplied = emails.some(e => e.events.some(ev => ev.type === 'replied'));
            const sb = statusBadge(thread.state);

            return (
              <div
                key={thread.id}
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Link
                      href={`/prospects/${thread.prospect?.id}`}
                      style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}
                    >
                      {thread.prospect?.companyName ?? thread.prospect?.domain ?? 'Unknown'}
                    </Link>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{thread.prospect?.domain}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                    <span>{emails.length} email{emails.length !== 1 ? 's' : ''} sent</span>
                    {threadOpened && <span style={{ color: '#1565C0' }}>✓ Opened</span>}
                    {threadReplied && <span style={{ color: '#16a34a' }}>✓ Replied</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: sb.bg,
                    color: sb.color,
                  }}>
                    {sb.label}
                  </span>
                  <Link
                    href={`/prospects/${thread.prospect?.id}`}
                    style={{
                      fontSize: '12px',
                      color: '#1565C0',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    View →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
