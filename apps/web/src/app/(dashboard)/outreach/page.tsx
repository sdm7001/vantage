import { prisma } from '@vantage/database';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ApproveButton, PauseResumeButton, CompleteButton } from './OutreachActions';

const TERMINAL_STATES = ['COMPLETED', 'REPLIED', 'OPTED_OUT', 'BOUNCED', 'SUPPRESSED'];

const threadStateBadge = (state: string, paused: boolean) => {
  if (paused) return { bg: '#fefce8', color: '#ca8a04', label: 'Paused' };
  if (state === 'REPLIED') return { bg: '#f0fdf4', color: '#16a34a', label: 'Replied' };
  if (state === 'COMPLETED') return { bg: '#f1f5f9', color: '#64748b', label: 'Completed' };
  if (state === 'OPTED_OUT') return { bg: '#fef2f2', color: '#b91c1c', label: 'Opted Out' };
  if (state === 'BOUNCED') return { bg: '#fef2f2', color: '#b91c1c', label: 'Bounced' };
  if (state === 'SUPPRESSED') return { bg: '#fef2f2', color: '#b91c1c', label: 'Suppressed' };
  if (state.includes('FOLLOWUP')) {
    const n = state.match(/FOLLOWUP_(\d)/)?.[1] ?? '?';
    const sent = state.includes('SENT');
    return { bg: '#eff6ff', color: '#1d4ed8', label: `Follow-up ${n} ${sent ? 'Sent' : 'Queued'}` };
  }
  if (state === 'INITIAL_SENT') return { bg: '#eff6ff', color: '#1d4ed8', label: 'Initial Sent' };
  if (state === 'INITIAL_QUEUED') return { bg: '#fefce8', color: '#ca8a04', label: 'Initial Queued' };
  if (state === 'APPROVED') return { bg: '#f5f3ff', color: '#7c3aed', label: 'Approved' };
  return { bg: '#f1f5f9', color: '#64748b', label: state };
};

export default async function OutreachPage() {
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const org = await prisma.organization.findFirst({ where: { clerkOrgId: orgId } });
  if (!org) return notFound();

  const today = new Date().toISOString().slice(0, 10);

  const [pendingApproval, activeThreads, terminalThreads, dailyLimit, activeCampaign, campaigns] =
    await Promise.all([
      // Prospects with a ready report and no thread yet
      prisma.prospect.findMany({
        where: {
          orgId: org.id,
          status: 'REPORT_READY' as never,
          reports: { some: { status: 'ready' } },
          threads: { none: {} },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
          reports: {
            where: { status: 'ready' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { audit: { select: { overallScore: true } } },
          },
        },
      }),

      // Active non-terminal threads
      prisma.outreachThread.findMany({
        where: {
          prospect: { orgId: org.id },
          state: { notIn: TERMINAL_STATES as never[] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        include: {
          prospect: { select: { id: true, companyName: true, domain: true } },
          campaign: { select: { id: true, name: true } },
          emails: {
            orderBy: { sequenceIndex: 'asc' },
            include: { events: { select: { type: true }, orderBy: { createdAt: 'desc' }, take: 5 } },
          },
        },
      }),

      // Terminal threads (replied, completed, opted out)
      prisma.outreachThread.findMany({
        where: {
          prospect: { orgId: org.id },
          state: { in: TERMINAL_STATES as never[] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: {
          prospect: { select: { id: true, companyName: true, domain: true } },
          campaign: { select: { id: true, name: true } },
          emails: {
            where: { status: 'sent' },
            select: { sequenceIndex: true, events: { select: { type: true } } },
          },
        },
      }),

      prisma.dailyEmailLimit.findUnique({ where: { orgId_date: { orgId: org.id, date: today } } }),
      prisma.campaign.findFirst({ where: { orgId: org.id, status: 'active' }, orderBy: { createdAt: 'asc' } }),
      prisma.campaign.findMany({ where: { orgId: org.id, status: 'active' }, select: { id: true, name: true } }),
    ]);

  const emailsToday = dailyLimit?.newOutboundSent ?? 0;
  const cap = activeCampaign?.dailyNewLimit ?? 10;
  const capPct = Math.min(Math.round((emailsToday / cap) * 100), 100);

  const scoreColor = (s: number | null | undefined) => {
    if (s == null) return '#94a3b8';
    return s >= 70 ? '#16a34a' : s >= 45 ? '#d97706' : '#dc2626';
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Outreach</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
          Approval queue, active threads, and follow-up tracking
        </p>
      </div>

      {/* Outreach rules banner */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
        padding: '12px 18px', marginBottom: '16px',
        display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rules</span>
        {[
          { icon: '📬', text: `Max ${cap} new initial emails / day` },
          { icon: '🔁', text: 'Max 5 follow-ups per contact' },
          { icon: '✉️', text: "Follow-ups don't count toward daily cap" },
          { icon: '🛑', text: 'Auto-stop on reply, bounce, or unsubscribe' },
        ].map(r => (
          <span key={r.text} style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>{r.icon}</span> {r.text}
          </span>
        ))}
      </div>

      {/* Daily cap meter */}
      <div style={{
        background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px',
        padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '24px', alignItems: 'center',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Daily Send Cap</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: emailsToday >= cap ? '#dc2626' : '#0f172a' }}>
              {emailsToday} / {cap} today
            </span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '10px' }}>
            <div style={{
              background: emailsToday >= cap ? '#dc2626' : emailsToday >= cap * 0.8 ? '#f59e0b' : '#16a34a',
              width: `${capPct}%`, height: '100%', borderRadius: '6px', minWidth: emailsToday > 0 ? '6px' : '0',
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            Follow-ups do not count toward this cap · Resets at midnight
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1565C0' }}>{pendingApproval.length}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Pending Approval</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#6366f1' }}>{activeThreads.length}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Active Threads</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>
              {terminalThreads.filter((t: { state: string }) => t.state === 'REPLIED').length}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Replied</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Pending Approval */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
          Pending Approval
          {pendingApproval.length > 0 && (
            <span style={{ marginLeft: '8px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>
              {pendingApproval.length}
            </span>
          )}
        </h2>

        {emailsToday >= cap && pendingApproval.length > 0 && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#991b1b',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span>⚠</span>
            <span>
              Daily cap reached ({emailsToday}/{cap}). Approvals will be queued and sent tomorrow when the cap resets.
            </span>
          </div>
        )}

        {pendingApproval.length === 0 ? (
          <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: '10px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>No prospects waiting for outreach approval.</div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
              Prospects appear here when they reach <strong>REPORT_READY</strong> status.
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Prospect</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Primary Contact</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Score</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Campaign</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(pendingApproval as Array<{
                  id: string;
                  companyName: string | null;
                  domain: string;
                  contacts: Array<{ firstName: string | null; lastName: string | null; email: string | null; title: string | null }>;
                  reports: Array<{ publicToken: string; audit: { overallScore: number | null } | null }>;
                }>).map(p => {
                  const contact = p.contacts[0];
                  const report = p.reports[0];
                  const score = report?.audit?.overallScore ?? null;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/prospects/${p.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.companyName ?? p.domain}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{p.domain}</div>
                        </Link>
                        {report?.publicToken && (
                          <a
                            href={`/reports/${report.publicToken}`}
                            target="_blank"
                            style={{ fontSize: '10px', color: '#1565C0', textDecoration: 'none', fontWeight: 600 }}
                          >
                            View report →
                          </a>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {contact ? (
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {[contact.firstName, contact.lastName].filter(Boolean).join(' ') || '—'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {contact.title ?? contact.email ?? '—'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#fca5a5', fontSize: '12px' }}>No contact — add one first</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {score != null ? (
                          <span style={{
                            padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800,
                            color: scoreColor(score),
                            background: score >= 70 ? '#f0fdf4' : score >= 45 ? '#fefce8' : '#fef2f2',
                          }}>
                            {score}/100
                          </span>
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {campaigns.length > 0 ? (campaigns.length === 1 ? campaigns[0]?.name : `${campaigns.length} campaigns`) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {contact?.email ? (
                          <ApproveButton
                            prospectId={p.id}
                            campaignId={campaigns[0]?.id}
                            campaigns={campaigns}
                          />
                        ) : (
                          <Link
                            href={`/prospects/${p.id}`}
                            style={{ fontSize: '12px', color: '#1565C0', textDecoration: 'none', fontWeight: 600 }}
                          >
                            Add contact →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 2: Active Threads */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
          Active Threads
          {activeThreads.length > 0 && (
            <span style={{ marginLeft: '8px', background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>
              {activeThreads.length}
            </span>
          )}
        </h2>

        {activeThreads.length === 0 ? (
          <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: '10px', padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>No active outreach threads.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(activeThreads as Array<{
              id: string;
              state: string;
              pausedAt: Date | null;
              pausedReason: string | null;
              nextActionAt: Date | null;
              prospect: { id: string; companyName: string | null; domain: string };
              campaign: { id: string; name: string } | null;
              emails: Array<{
                sequenceIndex: number;
                status: string;
                subject: string | null;
                sentAt?: Date | null;
                events: Array<{ type: string }>;
              }>;
            }>).map(thread => {
              const badge = threadStateBadge(thread.state, !!thread.pausedAt);
              const sentEmails = thread.emails.filter(e => e.status === 'sent');
              const hasOpen = thread.emails.some(e => e.events.some(ev => ev.type === 'opened'));
              const hasClick = thread.emails.some(e => e.events.some(ev => ev.type === 'clicked'));
              const lastEmailIdx = sentEmails.length > 0 ? Math.max(...sentEmails.map(e => e.sequenceIndex)) : -1;
              const lastSentEmail = sentEmails.find(e => e.sequenceIndex === lastEmailIdx);

              return (
                <div
                  key={thread.id}
                  style={{
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px',
                    padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Link href={`/prospects/${thread.prospect.id}`} style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a', textDecoration: 'none' }}>
                        {thread.prospect.companyName ?? thread.prospect.domain}
                      </Link>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{thread.prospect.domain}</span>
                      {thread.campaign && (
                        <span style={{ fontSize: '10px', background: '#eff6ff', color: '#1565C0', padding: '1px 7px', borderRadius: '10px', fontWeight: 600 }}>
                          {thread.campaign.name}
                        </span>
                      )}
                    </div>
                    {lastSentEmail?.subject && (
                      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '3px', fontStyle: 'italic' }}>
                        &ldquo;{lastSentEmail.subject}&rdquo;
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#64748b', alignItems: 'center' }}>
                      <span>{sentEmails.length} email{sentEmails.length !== 1 ? 's' : ''} sent</span>
                      {lastEmailIdx >= 0 && (
                        <span style={{ color: '#94a3b8' }}>
                          {lastEmailIdx === 0 ? 'Initial' : `Follow-up #${lastEmailIdx}`}
                        </span>
                      )}
                      {hasOpen && <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Opened</span>}
                      {hasClick && <span style={{ color: '#1565C0', fontWeight: 600 }}>✓ Clicked</span>}
                      {thread.nextActionAt && !thread.pausedAt && (
                        <span style={{ color: '#94a3b8' }}>
                          Next: {new Date(thread.nextActionAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {thread.pausedAt && thread.pausedReason && (
                      <div style={{ fontSize: '11px', color: '#ca8a04', marginTop: '4px' }}>
                        Paused: {thread.pausedReason}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0, marginLeft: '16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    <PauseResumeButton threadId={thread.id} isPaused={!!thread.pausedAt} />
                    <CompleteButton threadId={thread.id} />
                    <Link
                      href={`/prospects/${thread.prospect.id}`}
                      style={{ fontSize: '12px', color: '#1565C0', textDecoration: 'none', fontWeight: 600 }}
                    >
                      View →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: Terminal (Replied, Completed, Opted Out) */}
      {terminalThreads.length > 0 && (
        <section>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
            Closed Threads
            <span style={{ marginLeft: '8px', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>
              {terminalThreads.length}
            </span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(terminalThreads as Array<{
              id: string;
              state: string;
              updatedAt: Date;
              pausedAt: Date | null;
              prospect: { id: string; companyName: string | null; domain: string };
              campaign: { id: string; name: string } | null;
              emails: Array<{ sequenceIndex: number; events: Array<{ type: string }> }>;
            }>).map(thread => {
              const badge = threadStateBadge(thread.state, false);
              const sent = thread.emails.length;
              const replied = thread.emails.some(e => e.events.some(ev => ev.type === 'replied'));
              return (
                <div
                  key={thread.id}
                  style={{
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                    padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Link href={`/prospects/${thread.prospect.id}`} style={{ fontWeight: 600, fontSize: '13px', color: '#334155', textDecoration: 'none' }}>
                      {thread.prospect.companyName ?? thread.prospect.domain}
                    </Link>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{sent} email{sent !== 1 ? 's' : ''}</span>
                    {replied && <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>🎉 Replied</span>}
                    {thread.campaign && <span style={{ fontSize: '10px', color: '#94a3b8' }}>{thread.campaign.name}</span>}
                    <span style={{ fontSize: '10px', color: '#cbd5e1', marginLeft: 'auto' }}>
                      {new Date(thread.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: badge.bg, color: badge.color, marginLeft: '12px' }}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
