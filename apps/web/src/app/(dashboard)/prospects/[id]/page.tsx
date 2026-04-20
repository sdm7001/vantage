import { prisma } from '@vantage/database';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProspectActions from './ProspectActions';
import AddContact from './AddContact';
import RemoveContact from './RemoveContact';
import SetPrimaryContact from './SetPrimaryContact';

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const org = await prisma.organization.findFirst({ where: { clerkOrgId: orgId } });
  if (!org) return notFound();

  const prospect = await prisma.prospect.findFirst({
    where: { id, orgId: org.id },
    include: {
      contacts: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      audits: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          dimensionScores: { orderBy: [{ category: 'asc' }, { score: 'asc' }] },
          recommendations: { orderBy: [{ priority: 'asc' }, { impact: 'desc' }] },
        },
      },
      reports: { where: { status: 'ready' }, orderBy: { createdAt: 'desc' }, take: 1 },
      briefs: { orderBy: { createdAt: 'desc' }, take: 1 },
      painPoints: { orderBy: { createdAt: 'desc' }, take: 1 },
      threads: {
        include: {
          emails: {
            orderBy: { sequenceIndex: 'asc' },
            include: { events: { orderBy: { createdAt: 'asc' } } },
          },
          campaign: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      workflowRuns: { orderBy: { startedAt: 'desc' }, take: 3 },
    },
  });

  if (!prospect) return notFound();

  const audit = prospect.audits[0];
  const report = prospect.reports[0];
  const brief = prospect.briefs[0];
  const painPoint = prospect.painPoints[0];
  const workflow = prospect.workflowRuns[0];

  // Score helpers
  const scoreColor = (s: number) => s >= 70 ? '#16a34a' : s >= 45 ? '#d97706' : '#dc2626';
  const scoreBg = (s: number) => s >= 70 ? '#f0fdf4' : s >= 45 ? '#fefce8' : '#fef2f2';
  const dimColor = (s: number) => s >= 7 ? '#16a34a' : s >= 4 ? '#d97706' : '#dc2626';
  const dimBg = (s: number) => s >= 7 ? '#f0fdf4' : s >= 4 ? '#fefce8' : '#fef2f2';

  // Group dimension scores by category
  type DimScore = { id: string; category: string; dimension: string; score: number; wins: unknown; criticalFixes: unknown };
  const byCategory: Record<string, DimScore[]> = {};
  if (audit) {
    for (const d of audit.dimensionScores as DimScore[]) {
      (byCategory[d.category] ??= []).push(d);
    }
  }

  const CATEGORY_DISPLAY: Record<string, { label: string; icon: string; weight: string }> = {
    content: { label: 'Content & Messaging', icon: '✍️', weight: '25%' },
    ux_cro: { label: 'UX / Conversion', icon: '🖱️', weight: '20%' },
    seo: { label: 'SEO', icon: '🔍', weight: '20%' },
    visual_design: { label: 'Visual Design', icon: '🎨', weight: '15%' },
    geo_ai: { label: 'GEO / AI Search', icon: '🤖', weight: '15%' },
  };

  type Rec = { id: string; priority: string; title: string; description: string; effort: string; impact: string; category: string };
  const p0Recs = (audit?.recommendations as Rec[] | undefined)?.filter(r => r.priority === 'P0') ?? [];
  const p1Recs = (audit?.recommendations as Rec[] | undefined)?.filter(r => r.priority === 'P1') ?? [];

  type Email = {
    id: string; sequenceIndex: number; sentAt: Date | null; status: string;
    subject: string | null; htmlBody: string; events: Array<{ type: string; createdAt: Date }>;
  };


  type Thread = {
    id: string; state: string; nextActionAt: Date | null; pausedAt: Date | null; pausedReason: string | null;
    campaign: { name: string } | null;
    emails: Email[];
  };

  type ContactRow = {
    id: string; firstName: string | null; lastName: string | null;
    title: string | null; email: string | null; isPrimary: boolean;
  };

  const statusColors: Record<string, string> = {
    NEW: '#94a3b8', ENRICHING: '#1565C0', ENRICHED: '#6366f1',
    AUDITING: '#f59e0b', AUDITED: '#f97316',
    REPORT_GENERATING: '#8b5cf6', REPORT_READY: '#10b981',
    OUTREACH_QUEUED: '#06b6d4', OUTREACH_SENT: '#0ea5e9',
    ENGAGED: '#84cc16', CONVERTED: '#16a34a',
    SUPPRESSED: '#6b7280', UNSUBSCRIBED: '#b91c1c', ARCHIVED: '#94a3b8',
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      {/* Back nav */}
      <Link href="/prospects" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>← All Prospects</Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '12px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
              {prospect.companyName ?? prospect.domain}
            </h1>
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
              background: `${statusColors[prospect.status] ?? '#94a3b8'}20`,
              color: statusColors[prospect.status] ?? '#94a3b8',
            }}>
              {prospect.status}
            </span>
            {audit?.overallScore != null && (
              <span style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 800,
                background: scoreBg(audit.overallScore), color: scoreColor(audit.overallScore),
              }}>
                {audit.overallScore}/100
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {prospect.domain}
            {prospect.industry && ` · ${prospect.industry}`}
            {prospect.city && ` · ${prospect.city}`}
            {prospect.state && `, ${prospect.state}`}
          </div>
        </div>
        <ProspectActions
          prospectId={prospect.id}
          reportToken={report?.publicToken}
          threadId={(prospect.threads[0] as Thread | undefined)?.id}
          threadPaused={!!(prospect.threads[0] as Thread | undefined)?.pausedAt}
          threadState={(prospect.threads[0] as Thread | undefined)?.state}
        />
      </div>

      {/* Running workflow banner */}
      {workflow?.status === 'running' && (
        <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>⏳</span>
          <span>Pipeline running — {(workflow.steps as Array<{ name: string; status: string }>).find(s => s.status === 'running')?.name ?? 'processing'}…</span>
        </div>
      )}
      {workflow?.status === 'failed' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#991b1b' }}>
          ⚠ Pipeline failed: {workflow.errorMessage?.slice(0, 120)}
        </div>
      )}

      {/* ── NEXT RECOMMENDED ACTION ── */}
      {(() => {
        type ActionItem = { icon: string; title: string; body: string; cta?: string; ctaHref?: string; color: string; bg: string; border: string };
        const actions: Record<string, ActionItem> = {
          NEW: {
            icon: '⚡', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
            title: 'Run Full Pipeline',
            body: 'Enrich contacts, audit the website across 36 dimensions, and generate the branded PDF report.',
            cta: 'Use the "Full Pipeline" button above',
          },
          ENRICHING: {
            icon: '⏳', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
            title: 'Enrichment in Progress',
            body: 'The enrichment agent is discovering contacts and firmographic data. This usually takes under a minute.',
          },
          ENRICHED: {
            icon: '🔍', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc',
            title: 'Ready to Audit',
            body: 'Contacts are enriched. Run the audit to evaluate the website across content, UX, SEO, design, and GEO.',
            cta: 'Use the "Run Audit" button above',
          },
          AUDITING: {
            icon: '⏳', color: '#d97706', bg: '#fffbeb', border: '#fde68a',
            title: 'Audit in Progress',
            body: '5 AI agents are evaluating the site in parallel — content, UX/CRO, SEO, visual design, GEO. Usually 2–3 minutes.',
          },
          AUDITED: {
            icon: '📄', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
            title: 'Generate Report',
            body: 'Audit complete. Generate the branded PDF report with pain-point analysis, internal brief, and outreach copy.',
            cta: 'Use the "Regenerate Report" button above',
          },
          REPORT_GENERATING: {
            icon: '⏳', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
            title: 'Report Being Generated',
            body: 'Claude is writing the report sections and a PDF is being assembled. Usually under 90 seconds.',
          },
          REPORT_READY: {
            icon: '✉', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',
            title: 'Approve Outreach',
            body: 'The report is ready. Review the pain points and internal brief below, then approve the initial email.',
            cta: 'Use the "Approve Outreach" button above — or go to',
            ctaHref: '/outreach',
          },
          OUTREACH_QUEUED: {
            icon: '⏳', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc',
            title: 'Initial Email Queued',
            body: 'The outreach email is being generated and will send within daily cap limits (max 10/day). Check the Outreach page.',
          },
          OUTREACH_SENT: {
            icon: '📬', color: '#0284c7', bg: '#e0f2fe', border: '#7dd3fc',
            title: 'Outreach Sent — Monitor Engagement',
            body: 'The initial email was sent. Follow-ups are scheduled automatically (+3, +7, +14, +21, +28 days). Watch for opens, clicks, and replies below.',
          },
          ENGAGED: {
            icon: '🔥', color: '#65a30d', bg: '#f7fee7', border: '#bef264',
            title: 'Prospect Engaged!',
            body: 'The prospect has opened or clicked. A reply or direct call is the next best move. The follow-up sequence continues.',
          },
          CONVERTED: {
            icon: '🏆', color: '#15803d', bg: '#dcfce7', border: '#86efac',
            title: 'Converted — No Action Needed',
            body: 'This prospect became a client. Mark any open threads as completed.',
          },
          SUPPRESSED: {
            icon: '🚫', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb',
            title: 'Suppressed',
            body: 'All contacts are on the suppression list. No further outreach will be sent.',
          },
          UNSUBSCRIBED: {
            icon: '🛑', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca',
            title: 'Unsubscribed',
            body: 'This prospect opted out of outreach. They have been added to the suppression list and will not receive further emails.',
          },
        };

        const action = actions[prospect.status];
        if (!action || workflow?.status === 'running') return null;

        return (
          <div style={{
            background: action.bg, border: `1px solid ${action.border}`,
            borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
            display: 'flex', alignItems: 'flex-start', gap: '14px',
          }}>
            <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>{action.icon}</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: action.color, marginBottom: '3px' }}>
                Next: {action.title}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                {action.body}
                {action.ctaHref && (
                  <> <a href={action.ctaHref} style={{ color: action.color, fontWeight: 600 }}>Outreach queue →</a></>
                )}
                {action.cta && !action.ctaHref && (
                  <span style={{ color: '#94a3b8' }}> · {action.cta}</span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── AUDIT RESULTS ── */}
          {audit ? (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Website Audit</h2>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {new Date(audit.createdAt).toLocaleDateString()} · {audit.status}
                </span>
              </div>

              {/* Category scores */}
              {Object.entries(byCategory).map(([cat, dims]) => {
                const catInfo = CATEGORY_DISPLAY[cat];
                const avgScore = Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length * 10);
                return (
                  <div key={cat} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                        {catInfo?.icon} {catInfo?.label ?? cat}
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400, marginLeft: '6px' }}>{catInfo?.weight}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: scoreColor(avgScore) }}>{avgScore}/100</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px' }}>
                      {dims.map(d => (
                        <div key={d.id} style={{
                          padding: '7px 10px', borderRadius: '6px',
                          background: dimBg(d.score),
                          borderLeft: `3px solid ${dimColor(d.score)}`,
                        }}>
                          <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '1px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.category}</div>
                          <div style={{ fontSize: '10px', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                            {d.dimension.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: dimColor(d.score) }}>{d.score}<span style={{ fontSize: '10px', color: '#94a3b8' }}>/10</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* P0 recommendations */}
              {p0Recs.length > 0 && (
                <div style={{ marginTop: '16px', padding: '14px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', marginBottom: '10px' }}>⚠ CRITICAL ISSUES (P0)</div>
                  {p0Recs.slice(0, 5).map((r: Rec) => (
                    <div key={r.id} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#7f1d1d' }}>{r.title}</div>
                      <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px' }}>{r.description}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>Effort: {r.effort} · Impact: {r.impact}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* P1 recommendations */}
              {p1Recs.length > 0 && (
                <div style={{ marginTop: '12px', padding: '14px', background: '#fefce8', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#ca8a04', marginBottom: '10px' }}>⚡ IMPROVEMENTS (P1)</div>
                  {p1Recs.slice(0, 4).map((r: Rec) => (
                    <div key={r.id} style={{ marginBottom: '7px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#78350f' }}>{r.title}</div>
                      <div style={{ fontSize: '11px', color: '#92400e', marginTop: '1px' }}>{r.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section style={{ background: 'white', border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>No audit yet</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Run an audit or trigger the full pipeline to evaluate this site.</div>
            </section>
          )}

          {/* ── INTERNAL BRIEF ── */}
          {brief && (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Internal Sales Brief</h2>
              {brief.appointmentAngle && (
                <div style={{ background: '#eff6ff', borderLeft: '4px solid #1565C0', padding: '10px 14px', borderRadius: '0 6px 6px 0', marginBottom: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#1565C0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Appointment Angle</div>
                  <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>{brief.appointmentAngle}</div>
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {brief.markdownContent}
              </div>
            </section>
          )}

          {/* ── OUTREACH THREADS ── */}
          {prospect.threads.length > 0 && (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>Outreach History</h2>
              {prospect.threads.map((t: Thread) => (
                <div key={t.id} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {t.campaign?.name && (
                        <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1565C0', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                          {t.campaign.name}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '10px' }}>
                        {t.state}
                      </span>
                    </div>
                    {t.nextActionAt && (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Next: {new Date(t.nextActionAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(t.emails as Email[]).map(email => {
                      const hasOpen = email.events.some(e => e.type === 'opened');
                      const hasClick = email.events.some(e => e.type === 'clicked');
                      const hasReply = email.events.some(e => e.type === 'replied');
                      return (
                        <div key={email.id} style={{ paddingLeft: '16px', borderLeft: `3px solid ${email.status === 'sent' ? '#1565C0' : '#e2e8f0'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                                {email.sequenceIndex === 0 ? 'Initial Email' : `Follow-up #${email.sequenceIndex}`}
                                {email.sentAt && ` · ${new Date(email.sentAt).toLocaleDateString()}`}
                              </div>
                              {email.subject && (
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{email.subject}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                              {hasOpen && <span style={{ fontSize: '10px', color: '#16a34a', background: '#f0fdf4', padding: '2px 7px', borderRadius: '10px' }}>Opened</span>}
                              {hasClick && <span style={{ fontSize: '10px', color: '#1565C0', background: '#eff6ff', padding: '2px 7px', borderRadius: '10px' }}>Clicked</span>}
                              {hasReply && <span style={{ fontSize: '10px', color: '#8b5cf6', background: '#f5f3ff', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>Replied 🎉</span>}
                              {email.status === 'queued' && <span style={{ fontSize: '10px', color: '#94a3b8', background: '#f1f5f9', padding: '2px 7px', borderRadius: '10px' }}>Queued</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {t.pausedAt && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#ca8a04', background: '#fefce8', padding: '6px 10px', borderRadius: '4px' }}>
                      Paused: {t.pausedReason ?? 'manually paused'}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>

        {/* ── RIGHT COLUMN ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Contacts */}
          <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Contacts</h3>
            {prospect.contacts.length === 0 && (
              <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>No contacts — run enrichment</div>
            )}
            {prospect.contacts.length > 0 && prospect.contacts.map((c: ContactRow) => (
                <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                      {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                    </span>
                    {c.isPrimary && (
                      <span style={{ fontSize: '9px', background: '#1565C0', color: 'white', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>
                        PRIMARY
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      {!c.isPrimary && <SetPrimaryContact contactId={c.id} prospectId={prospect.id} />}
                      <RemoveContact contactId={c.id} prospectId={prospect.id} />
                    </span>
                  </div>
                  {c.title && <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>{c.title}</div>}
                  {c.email && (
                    <a href={`mailto:${c.email}`} style={{ fontSize: '11px', color: '#1565C0', textDecoration: 'none' }}>{c.email}</a>
                  )}
                </div>
              ))
            }
            <AddContact prospectId={prospect.id} />
          </section>

          {/* Report */}
          {report && (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>PDF Report</h3>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
                Generated {new Date(report.generatedAt!).toLocaleDateString()} · {report.viewCount} views
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link href={`/reports/${report.id}`}
                  style={{ background: '#eff6ff', color: '#1565C0', padding: '9px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, textAlign: 'center', border: '1px solid #bfdbfe' }}>
                  📋 Report Details
                </Link>
                <a href={`/reports/${report.publicToken}`} target="_blank"
                  style={{ background: '#f8fafc', color: '#1e293b', padding: '9px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  👁 View Public Report
                </a>
                <a href={`/api/reports/${report.publicToken}?download=1`}
                  style={{ background: '#0f172a', color: 'white', padding: '9px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                  ↓ Download PDF
                </a>
              </div>
              <div style={{ marginTop: '10px', padding: '8px 10px', background: '#f1f5f9', borderRadius: '6px' }}>
                <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Public share link</div>
                <div style={{ fontSize: '11px', color: '#1565C0', wordBreak: 'break-all' }}>
                  /reports/{report.publicToken.slice(0, 16)}…
                </div>
              </div>
            </section>
          )}

          {/* Pain Points & Outreach Angles */}
          {painPoint && (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Outreach Intelligence</h3>
              <div style={{ background: '#fef9c3', borderRadius: '6px', padding: '10px 12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Primary Pain Point</div>
                <div style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.5, fontStyle: 'italic' }}>
                  &ldquo;{painPoint.primaryPainPoint}&rdquo;
                </div>
              </div>
              {(painPoint.outreachAngles as Array<{ angle: string; tactic: string; hookLine: string }>).slice(0, 3).map((a, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1565C0', marginBottom: '2px' }}>{a.angle}</div>
                  {a.hookLine && <div style={{ fontSize: '11px', color: '#475569' }}>{a.hookLine}</div>}
                </div>
              ))}
              {(painPoint.valueHooks as string[]).length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Value Hooks</div>
                  {(painPoint.valueHooks as string[]).slice(0, 3).map((h, i) => (
                    <div key={i} style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>· {h}</div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Prospect meta */}
          <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>Details</h3>
            {[
              { label: 'Domain', value: prospect.domain },
              { label: 'Industry', value: prospect.industry },
              { label: 'Location', value: [prospect.city, prospect.state].filter(Boolean).join(', ') },
              { label: 'ICP Score', value: prospect.icpScore != null ? `${prospect.icpScore}/100` : null },
              { label: 'Source', value: prospect.sourceType },
              { label: 'Added', value: new Date(prospect.createdAt).toLocaleDateString() },
            ].map(row => row.value ? (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8fafc', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8' }}>{row.label}</span>
                <span style={{ color: '#334155', fontWeight: 500 }}>{row.value}</span>
              </div>
            ) : null)}
          </section>
        </div>
      </div>
    </div>
  );
}
