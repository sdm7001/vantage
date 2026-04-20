'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../../lib/trpc';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  NEW:                { bg: '#f1f5f9', text: '#64748b' },
  ENRICHING:          { bg: '#eff6ff', text: '#3b82f6' },
  ENRICHED:           { bg: '#eef2ff', text: '#6366f1' },
  AUDITING:           { bg: '#fffbeb', text: '#d97706' },
  AUDITED:            { bg: '#fff7ed', text: '#f97316' },
  REPORT_GENERATING:  { bg: '#f5f3ff', text: '#7c3aed' },
  REPORT_READY:       { bg: '#f0fdf4', text: '#16a34a' },
  OUTREACH_QUEUED:    { bg: '#ecfeff', text: '#0891b2' },
  OUTREACH_SENT:      { bg: '#e0f2fe', text: '#0284c7' },
  ENGAGED:            { bg: '#f7fee7', text: '#65a30d' },
  CONVERTED:          { bg: '#dcfce7', text: '#15803d' },
  SUPPRESSED:         { bg: '#f9fafb', text: '#9ca3af' },
  ARCHIVED:           { bg: '#f9fafb', text: '#9ca3af' },
};

export default function ProspectsPage() {
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const { data: prospects, isLoading, refetch } = trpc.prospects.list.useQuery({
    search: search || undefined,
    status: statusFilter || undefined,
    limit: 50,
  });

  const createMutation = trpc.prospects.create.useMutation();
  const pipelineMutation = trpc.prospects.triggerFullPipeline.useMutation();

  async function handleAdd() {
    const cleaned = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    if (!cleaned) return;
    setAdding(true);
    setAddError('');
    try {
      const prospect = await createMutation.mutateAsync({ domain: cleaned });
      await pipelineMutation.mutateAsync({ prospectId: prospect.id });
      setDomain('');
      void refetch();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add prospect');
    } finally {
      setAdding(false);
    }
  }

  const statuses = [
    'NEW', 'ENRICHING', 'ENRICHED', 'AUDITING', 'AUDITED',
    'REPORT_GENERATING', 'REPORT_READY', 'OUTREACH_QUEUED',
    'OUTREACH_SENT', 'ENGAGED', 'CONVERTED',
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Prospects</h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
            Audit websites and launch personalized outreach
          </p>
        </div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          {prospects?.length ?? 0} prospects
        </div>
      </div>

      {/* Add prospect */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '10px', color: '#0f172a' }}>
          Add a new prospect
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="acmeplumbing.com"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void handleAdd()}
            style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none' }}
          />
          <button
            disabled={adding || !domain.trim()}
            onClick={() => void handleAdd()}
            style={{ background: adding ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 20px', fontWeight: 600, cursor: adding ? 'default' : 'pointer', fontSize: '14px', whiteSpace: 'nowrap' }}
          >
            {adding ? '⏳ Adding…' : '⚡ Add + Full Pipeline'}
          </button>
        </div>
        {addError && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>{addError}</div>
        )}
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
          Automatically runs: enrich → audit → report generation
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by name or domain…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 12px', fontSize: '13px', outline: 'none', background: 'white' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 12px', fontSize: '13px', background: 'white', cursor: 'pointer' }}
        >
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Prospect list */}
      {isLoading ? (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          Loading…
        </div>
      ) : !prospects?.length ? (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</div>
          <div style={{ fontWeight: 600, color: '#475569', marginBottom: '8px' }}>No prospects yet</div>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Add a domain above to run your first website audit.</div>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Company</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Domain</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Primary Contact</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Audits</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ padding: '10px 16px' }} />
              </tr>
            </thead>
            <tbody>
              {(prospects as unknown as Array<{ id: string; domain: string; companyName?: string | null; status: string; contacts: unknown[]; _count: unknown }>).map(p => {
                const colors = STATUS_COLORS[p.status] ?? STATUS_COLORS.NEW;
                const contact = (p.contacts as Array<{ firstName: string | null; lastName: string | null; email: string | null }>)[0];
                const counts = p._count as { audits: number; reports: number };
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/prospects/${p.id}`)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {(p as { companyName?: string | null }).companyName ?? p.domain}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.domain}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {contact
                        ? `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || contact.email || '—'
                        : <span style={{ color: '#cbd5e1' }}>No contacts</span>
                      }
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {counts.audits} audit{counts.audits !== 1 ? 's' : ''} · {counts.reports} report{counts.reports !== 1 ? 's' : ''}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: colors.bg, color: colors.text }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#94a3b8', fontSize: '16px' }}>→</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
