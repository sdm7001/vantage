import { prisma } from '@vantage/database';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProspectActions from './ProspectActions';

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
        include: { dimensionScores: { orderBy: { score: 'asc' } }, recommendations: { orderBy: { priority: 'asc' } } },
      },
      reports: { where: { status: 'ready' }, orderBy: { createdAt: 'desc' }, take: 1 },
      briefs: { orderBy: { createdAt: 'desc' }, take: 1 },
      painPoints: { orderBy: { createdAt: 'desc' }, take: 1 },
      threads: {
        include: {
          emails: { orderBy: { sequenceIndex: 'asc' }, include: { events: { orderBy: { createdAt: 'asc' } } } },
        },
        take: 1,
      },
      workflowRuns: { orderBy: { startedAt: 'desc' }, take: 1 },
    },
  });

  if (!prospect) return notFound();

  const audit = prospect.audits[0];
  const report = prospect.reports[0];
  const brief = prospect.briefs[0];
  const painPoint = prospect.painPoints[0];
  const thread = prospect.threads[0];
  const workflow = prospect.workflowRuns[0];

  const scoreColor = (s: number) => s >= 70 ? '#16a34a' : s >= 45 ? '#d97706' : '#dc2626';
  const dimScoreColor = (s: number) => s >= 7 ? '#16a34a' : s >= 4 ? '#d97706' : '#dc2626';

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      {/* Back + header */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/prospects" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>← Prospects</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
              {prospect.companyName ?? prospect.domain}
            </h1>
            <div style={{ fontSize: '13px', color: '#64748b' }}>{prospect.domain}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              background: '#f1f5f9', color: '#475569',
            }}>
              {prospect.status}
            </span>
            <ProspectActions prospectId={prospect.id} orgId={org.id} reportToken={report?.publicToken} />
          </div>
        </div>
      </div>

      {/* Workflow status banner */}
      {workflow?.status === 'running' && (
        <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#1e40af' }}>
          ⏳ Pipeline running — {(workflow.steps as Array<{ name: string; status: string }>).find(s => s.status === 'running')?.name ?? 'processing'}…
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Audit results */}
          {audit && (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Website Audit</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(audit.createdAt).toLocaleDateString()}</span>
                  {audit.overallScore != null && (
                    <span style={{ padding: '4px 12px', background: scoreColor(audit.overallScore), color: 'white', borderRadius: '20px', fontWeight: 700, fontSize: '13px' }}>
                      {audit.overallScore}/100
                    </span>
                  )}
                </div>
              </div>

              {/* Dimension scores grid */}
              {audit.dimensionScores.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {audit.dimensionScores.slice(0, 12).map((d: { id: string; category: string; dimension: string; score: number }) => (
                    <div key={d.id} style={{ padding: '8px', background: '#f8fafc', borderRadius: '6px', borderLeft: `3px solid ${dimScoreColor(d.score)}` }}>
                      <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '2px' }}>{d.category}</div>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#334155' }}>
                        {d.dimension.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: dimScoreColor(d.score) }}>{d.score}/10</div>
                    </div>
                  ))}
                </div>
              )}

              {/* P0 recommendations */}
              {audit.recommendations.filter((r: { priority: string }) => r.priority === 'P0').length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>⚠ CRITICAL ISSUES (P0)</div>
                  {audit.recommendations.filter((r: { priority: string }) => r.priority === 'P0').slice(0, 3).map((r: { id: string; title: string; description: string }) => (
                    <div key={r.id} style={{ padding: '8px 10px', background: '#fef2f2', borderLeft: '3px solid #dc2626', borderRadius: '4px', marginBottom: '6px', fontSize: '12px', color: '#7f1d1d' }}>
                      <strong>{r.title}</strong> — {r.description}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Internal brief */}
          {brief && (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Internal Sales Brief</h2>
              {brief.appointmentAngle && (
                <div style={{ background: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '10px 12px', borderRadius: '4px', marginBottom: '12px', fontSize: '13px', color: '#1e40af' }}>
                  <strong>Appointment angle:</strong> {brief.appointmentAngle}
                </div>
              )}
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {brief.markdownContent.slice(0, 800)}
                {brief.markdownContent.length > 800 ? '…' : ''}
              </div>
            </section>
          )}

          {/* Outreach thread */}
          {thread && (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Outreach Thread</h2>
                <span style={{ fontSize: '12px', padding: '2px 8px', background: '#f1f5f9', borderRadius: '20px', color: '#475569' }}>
                  {thread.state}
                </span>
              </div>
              {thread.emails.map((email: { id: string; sequenceIndex: number; sentAt: Date | null; status: string; subject: string | null; events: Array<{ type: string }> }) => (
                <div key={email.id} style={{ borderLeft: '3px solid #e2e8f0', paddingLeft: '12px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    #{email.sequenceIndex === 0 ? 'Initial' : `Follow-up ${email.sequenceIndex}`}
                    {email.sentAt && ` · ${new Date(email.sentAt).toLocaleDateString()}`}
                    {email.status === 'sent' && ' · ✓ Sent'}
                  </div>
                  {email.subject && <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{email.subject}</div>}
                  {email.events.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      {email.events.some((e: { type: string }) => e.type === 'opened') && <span style={{ fontSize: '10px', color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: '10px' }}>Opened</span>}
                      {email.events.some((e: { type: string }) => e.type === 'clicked') && <span style={{ fontSize: '10px', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '10px' }}>Clicked</span>}
                      {email.events.some((e: { type: string }) => e.type === 'replied') && <span style={{ fontSize: '10px', color: '#8b5cf6', background: '#f5f3ff', padding: '2px 6px', borderRadius: '10px' }}>Replied 🎉</span>}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Contacts */}
          <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Contacts</h3>
            {prospect.contacts.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>No contacts yet — run enrichment</div>
            ) : (
              prospect.contacts.map((c: { id: string; firstName: string | null; lastName: string | null; title: string | null; email: string | null; isPrimary: boolean }) => (
                <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {c.firstName} {c.lastName}
                    {c.isPrimary && <span style={{ fontSize: '9px', background: '#3b82f6', color: 'white', padding: '1px 5px', borderRadius: '10px', marginLeft: '6px' }}>PRIMARY</span>}
                  </div>
                  {c.title && <div style={{ fontSize: '11px', color: '#64748b' }}>{c.title}</div>}
                  {c.email && <div style={{ fontSize: '11px', color: '#3b82f6' }}>{c.email}</div>}
                </div>
              ))
            )}
          </section>

          {/* Report */}
          {report && (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>PDF Report</h3>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                Views: {report.viewCount} · Generated {new Date(report.generatedAt!).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href={`/reports/${report.publicToken}`} target="_blank"
                  style={{ background: '#f1f5f9', color: '#1e293b', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                  👁 View Report
                </a>
                <a href={`/api/reports/${report.publicToken}?download=1`}
                  style={{ background: '#0f172a', color: 'white', padding: '8px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                  ↓ Download PDF
                </a>
                <div style={{ fontSize: '10px', color: '#94a3b8', wordBreak: 'break-all' }}>
                  Share: /reports/{report.publicToken.slice(0, 12)}…
                </div>
              </div>
            </section>
          )}

          {/* Pain points */}
          {painPoint && (
            <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Outreach Angles</h3>
              <div style={{ fontSize: '12px', color: '#334155', marginBottom: '10px', fontStyle: 'italic' }}>
                &ldquo;{painPoint.primaryPainPoint}&rdquo;
              </div>
              {(painPoint.outreachAngles as Array<{ angle: string; hookLine: string }>).slice(0, 3).map((a, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>{a.angle}</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>{a.hookLine}</div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
