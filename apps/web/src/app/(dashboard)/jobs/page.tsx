import { prisma } from '@vantage/database';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

type Step = { name: string; status: 'pending' | 'running' | 'done' | 'failed' };
type RunRow = {
  id: string; status: string; type: string; steps: unknown;
  startedAt: Date; completedAt: Date | null; errorMessage: string | null;
  prospect: { id: string; companyName: string | null; domain: string } | null;
};

export default async function JobsPage() {
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const org = await prisma.organization.findFirst({ where: { clerkOrgId: orgId } });
  if (!org) return notFound();

  const [runs, stats] = await Promise.all([
    prisma.workflowRun.findMany({
      where: { orgId: org.id },
      orderBy: { startedAt: 'desc' },
      take: 60,
      include: {
        prospect: { select: { id: true, companyName: true, domain: true } },
      },
    }),
    prisma.workflowRun.groupBy({
      by: ['status'],
      where: { orgId: org.id },
      _count: { status: true },
    }),
  ]);

  const statMap = Object.fromEntries(stats.map((s: { status: string; _count: { status: number } }) => [s.status, s._count.status]));

  const statusStyle = (status: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      running: { background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 },
      completed: { background: '#f0fdf4', color: '#15803d', fontWeight: 700 },
      failed: { background: '#fef2f2', color: '#b91c1c', fontWeight: 700 },
    };
    return { ...{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }, ...(map[status] ?? {}) };
  };

  const stepIcon = (s: Step['status']) =>
    ({ pending: '○', running: '⏳', done: '✓', failed: '✗' })[s] ?? '○';

  const stepColor = (s: Step['status']) =>
    ({ pending: '#94a3b8', running: '#1565C0', done: '#16a34a', failed: '#dc2626' })[s] ?? '#94a3b8';

  const formatDuration = (start: Date, end?: Date | null) => {
    const ms = (end ?? new Date()).getTime() - start.getTime();
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Jobs & Pipeline Runs</h1>
      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Monitor workflow runs — enrichment, audit, report generation.</p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Running', value: statMap['running'] ?? 0, color: '#1565C0' },
          { label: 'Completed', value: statMap['completed'] ?? 0, color: '#16a34a' },
          { label: 'Failed', value: statMap['failed'] ?? 0, color: '#dc2626' },
          { label: 'Total', value: (statMap['running'] ?? 0) + (statMap['completed'] ?? 0) + (statMap['failed'] ?? 0), color: '#0f172a' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Job list */}
      {runs.length === 0 ? (
        <div style={{ background: 'white', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#334155' }}>No workflow runs yet</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Trigger a full pipeline from any prospect to see runs here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {runs.map((run: RunRow) => {
            const steps = (run.steps as Step[]) ?? [];

            return (
              <div key={run.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={statusStyle(run.status)}>{run.status}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        {run.type.replace(/_/g, ' ')}
                      </span>
                      {run.prospect && (
                        <Link href={`/prospects/${run.prospect.id}`} style={{ fontSize: '13px', color: '#1565C0', textDecoration: 'none' }}>
                          → {run.prospect.companyName ?? run.prospect.domain}
                        </Link>
                      )}
                    </div>

                    {/* Step pipeline */}
                    {steps.length > 0 && (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {steps.map((step, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {i > 0 && <span style={{ color: '#cbd5e1', fontSize: '12px' }}>→</span>}
                            <span style={{ fontSize: '11px', color: stepColor(step.status), fontWeight: step.status === 'running' ? 700 : 400 }}>
                              {stepIcon(step.status)} {step.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {run.status === 'failed' && run.errorMessage && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: '4px' }}>
                        {run.errorMessage.slice(0, 200)}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', marginLeft: '20px', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                      {new Date(run.startedAt).toLocaleDateString()} {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {formatDuration(run.startedAt, run.completedAt)}
                      {run.status === 'running' && ' elapsed'}
                    </div>
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
