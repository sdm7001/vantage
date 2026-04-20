import { prisma } from '@vantage/database';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReportRowActions from './ReportRowActions';

export default async function ReportsPage() {
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const org = await prisma.organization.findFirst({ where: { clerkOrgId: orgId } });
  if (!org) return notFound();

  const [reports, stats] = await Promise.all([
    prisma.prospectReport.findMany({
      where: { prospect: { orgId: org.id } },
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: {
        prospect: { select: { id: true, companyName: true, domain: true, status: true } },
        audit: { select: { overallScore: true } },
      },
    }),
    prisma.prospectReport.groupBy({
      by: ['status'],
      where: { prospect: { orgId: org.id } },
      _count: { status: true },
    }),
  ]);

  const statMap = Object.fromEntries(
    stats.map((s: { status: string; _count: { status: number } }) => [s.status, s._count.status])
  );
  const totalViews = reports.reduce((sum: number, r: { viewCount: number }) => sum + (r.viewCount ?? 0), 0);

  const scoreColor = (s: number | null) => {
    if (s == null) return '#94a3b8';
    return s >= 70 ? '#16a34a' : s >= 45 ? '#d97706' : '#dc2626';
  };
  const scoreBg = (s: number | null) => {
    if (s == null) return '#f1f5f9';
    return s >= 70 ? '#f0fdf4' : s >= 45 ? '#fefce8' : '#fef2f2';
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Reports</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
            All generated PDF reports — view, download, or regenerate
          </p>
        </div>
        <Link
          href="/prospects"
          style={{ fontSize: '13px', color: '#1565C0', textDecoration: 'none', fontWeight: 600 }}
        >
          + Add Prospect
        </Link>
      </div>

      {/* KPI bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total Reports', value: reports.length, color: '#0f172a' },
          { label: 'Ready', value: statMap['ready'] ?? 0, color: '#16a34a' },
          { label: 'Generating', value: statMap['generating'] ?? 0, color: '#7c3aed' },
          { label: 'Total Views', value: totalViews, color: '#0891b2' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {reports.length === 0 ? (
        <div style={{ background: 'white', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#334155' }}>No reports yet</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Run an audit and full pipeline on a prospect to generate the first report.
          </div>
          <Link
            href="/prospects"
            style={{
              display: 'inline-block', marginTop: '16px', background: '#1565C0', color: 'white',
              padding: '8px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '14px',
            }}
          >
            Go to Prospects →
          </Link>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Prospect</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Score</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Generated</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Views</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(reports as Array<{
                id: string;
                publicToken: string;
                status: string;
                generatedAt: Date | null;
                viewCount: number;
                prospect: { id: string; companyName: string | null; domain: string; status: string };
                audit: { overallScore: number | null } | null;
              }>).map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <Link href={`/reports/${r.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {r.prospect.companyName ?? r.prospect.domain}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{r.prospect.domain}</div>
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.audit?.overallScore != null ? (
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800,
                        background: scoreBg(r.audit.overallScore), color: scoreColor(r.audit.overallScore),
                      }}>
                        {r.audit.overallScore}/100
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                      background: r.status === 'ready' ? '#f0fdf4' : '#f5f3ff',
                      color: r.status === 'ready' ? '#16a34a' : '#7c3aed',
                    }}>
                      {r.status === 'ready' ? 'Ready' : 'Generating…'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {r.generatedAt
                      ? new Date(r.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : <span style={{ color: '#94a3b8' }}>In progress</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {r.viewCount ?? 0}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <ReportRowActions
                      reportId={r.id}
                      prospectId={r.prospect.id}
                      publicToken={r.publicToken}
                      reportStatus={r.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
