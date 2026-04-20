import { prisma } from '@vantage/database';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReportRowActions from '../ReportRowActions';

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const org = await prisma.organization.findFirst({ where: { clerkOrgId: orgId } });
  if (!org) return notFound();

  const report = await prisma.prospectReport.findFirst({
    where: { id, prospect: { orgId: org.id } },
    include: {
      prospect: {
        select: {
          id: true,
          companyName: true,
          domain: true,
          status: true,
          threads: {
            include: {
              campaign: { select: { id: true, name: true } },
              emails: {
                where: { status: 'sent' },
                select: { sequenceIndex: true },
              },
            },
          },
        },
      },
      audit: {
        select: {
          overallScore: true,
          status: true,
          createdAt: true,
          dimensionScores: { orderBy: [{ category: 'asc' }, { score: 'asc' }] },
        },
      },
    },
  });

  if (!report) return notFound();

  const reportData = report.jsonContent as Record<string, unknown> | null;
  const categoryScores = Array.isArray(reportData?.categoryScores)
    ? (reportData!.categoryScores as Array<{ label: string; score: number; weight: number }>)
    : [];
  const overallScore = report.audit?.overallScore ?? null;
  const company = report.prospect.companyName ?? report.prospect.domain;

  const totalEmails = report.prospect.threads.reduce((sum: number, t: { emails: unknown[] }) => sum + t.emails.length, 0);
  const threadCount = report.prospect.threads.length;

  const scoreColor = (s: number | null) =>
    s == null ? '#94a3b8' : s >= 70 ? '#16a34a' : s >= 45 ? '#d97706' : '#dc2626';
  const scoreBg = (s: number | null) =>
    s == null ? '#f1f5f9' : s >= 70 ? '#f0fdf4' : s >= 45 ? '#fefce8' : '#fef2f2';

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      ready:      { bg: '#f0fdf4', color: '#16a34a', label: 'Ready' },
      generating: { bg: '#f5f3ff', color: '#7c3aed', label: 'Generating…' },
      failed:     { bg: '#fef2f2', color: '#dc2626', label: 'Failed' },
    };
    return map[s] ?? { bg: '#f1f5f9', color: '#475569', label: s };
  };
  const rs = statusBadge(report.status);

  const dimensionsByCategory: Record<string, typeof report.audit.dimensionScores> = {};
  if (report.audit?.dimensionScores) {
    for (const d of report.audit.dimensionScores) {
      if (!dimensionsByCategory[d.category]) dimensionsByCategory[d.category] = [];
      dimensionsByCategory[d.category].push(d);
    }
  }

  const preview = report.markdownContent
    ? report.markdownContent.slice(0, 2000) + (report.markdownContent.length > 2000 ? '\n\n…' : '')
    : null;

  const publicUrl = `/reports/${report.publicToken}`;
  const downloadUrl = `/api/reports/${report.publicToken}?download=1`;

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/reports" style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'none' }}>
          ← Reports
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {company}
            </h1>
            <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: rs.bg, color: rs.color }}>
              {rs.label}
            </span>
            {overallScore != null && (
              <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, background: scoreBg(overallScore), color: scoreColor(overallScore) }}>
                {overallScore}/100
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{report.prospect.domain}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {report.status === 'ready' && (
            <>
              <a href={publicUrl} target="_blank" style={{ fontSize: '12px', fontWeight: 600, color: '#1565C0', background: '#eff6ff', padding: '6px 14px', borderRadius: '6px', textDecoration: 'none', border: '1px solid #bfdbfe' }}>
                View Public Report ↗
              </a>
              <a href={downloadUrl} style={{ fontSize: '12px', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '6px 14px', borderRadius: '6px', textDecoration: 'none', border: '1px solid #e2e8f0' }}>
                ↓ Download PDF
              </a>
            </>
          )}
          <ReportRowActions reportId={report.id} prospectId={report.prospect.id} publicToken={report.publicToken} reportStatus={report.status} />
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Public Views', value: report.viewCount ?? 0, color: '#0891b2' },
          { label: 'Outreach Threads', value: threadCount, color: '#7c3aed' },
          { label: 'Emails Sent', value: totalEmails, color: '#1565C0' },
          { label: 'Audit Score', value: overallScore != null ? `${overallScore}/100` : '—', color: scoreColor(overallScore) },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {categoryScores.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>Category Scores</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                {categoryScores.map(cat => {
                  const c = scoreColor(cat.score);
                  return (
                    <div key={cat.label} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', borderLeft: `3px solid ${c}` }}>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>{cat.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: c }}>{cat.score}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{Math.round(cat.weight * 100)}% weight</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(dimensionsByCategory).length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>Audit Dimensions</h2>
              {Object.entries(dimensionsByCategory).map(([cat, dims]) => (
                <div key={cat} style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{cat}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {dims.map((d: { id: string; dimension: string; score: number; category: string }) => {
                      const pct = Math.min(100, (d.score / 10) * 100);
                      const c = scoreColor(d.score * 10);
                      return (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ fontSize: '12px', color: '#334155', width: '180px', flexShrink: 0 }}>{d.dimension}</div>
                          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: '4px' }} />
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: c, width: '32px', textAlign: 'right' }}>{d.score}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {preview && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Report Preview</h2>
              <pre style={{ fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6', margin: 0 }}>
                {preview}
              </pre>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Prospect</div>
            <Link href={`/prospects/${report.prospect.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ fontWeight: 600, color: '#1565C0', fontSize: '14px' }}>{company}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{report.prospect.domain}</div>
            </Link>
            <div style={{ marginTop: '10px' }}>
              <span style={{
                padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                background: ['ENGAGED', 'CONVERTED', 'OUTREACH_SENT'].includes(report.prospect.status as string) ? '#f0fdf4' : '#f8fafc',
                color: ['ENGAGED', 'CONVERTED', 'OUTREACH_SENT'].includes(report.prospect.status as string) ? '#16a34a' : '#475569',
              }}>
                {report.prospect.status}
              </span>
            </div>
          </div>

          {threadCount > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Campaigns</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.prospect.threads.map((t: { id: string; emails: unknown[]; campaign: { name: string } | null }) => (
                  <div key={t.id} style={{ fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{t.campaign?.name ?? 'Campaign'}</div>
                    <div style={{ color: '#94a3b8', marginTop: '1px' }}>{t.emails.length} email{t.emails.length !== 1 ? 's' : ''} sent</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Public Share Link</div>
            <div style={{ fontSize: '11px', color: '#475569', wordBreak: 'break-all', marginBottom: '8px', fontFamily: 'monospace', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px' }}>
              {publicUrl}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{report.viewCount ?? 0} view{(report.viewCount ?? 0) !== 1 ? 's' : ''}</div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Metadata</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Generated</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>
                  {report.generatedAt
                    ? new Date(report.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </span>
              </div>
              {report.audit && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Audit date</span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>
                    {new Date(report.audit.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>PDF</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>{report.pdfKey ? 'Stored' : 'Not stored'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
