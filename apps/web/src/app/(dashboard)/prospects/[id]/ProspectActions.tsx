'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function trpcMutate(path: string, input: unknown) {
  const res = await fetch(`/api/trpc/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: input }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

interface Props {
  prospectId: string;
  reportToken?: string;
  threadId?: string;
  threadPaused?: boolean;
  threadState?: string;
}

export default function ProspectActions({ prospectId, reportToken, threadId, threadPaused, threadState }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<unknown>) {
    setLoading(label);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      setSuccess(`${label} started`);
      setTimeout(() => { setSuccess(null); router.refresh(); }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          disabled={!!loading}
          onClick={() => run('Audit', () => trpcMutate('prospects.triggerAudit', { prospectId }))}
          style={btnStyle('#1565C0')}
        >
          {loading === 'Audit' ? '⏳' : '🔍'} Run Audit
        </button>

        <button
          disabled={!!loading}
          onClick={() => run('Pipeline', () => trpcMutate('prospects.triggerFullPipeline', { prospectId }))}
          style={btnStyle('#7c3aed')}
        >
          {loading === 'Pipeline' ? '⏳' : '⚡'} Full Pipeline
        </button>

        <button
          disabled={!!loading || !reportToken}
          title={!reportToken ? 'Requires a completed report' : undefined}
          onClick={() => run('Outreach', () => trpcMutate('outreach.approveInitial', { prospectId }))}
          style={btnStyle(reportToken ? '#16a34a' : '#94a3b8')}
        >
          {loading === 'Outreach' ? '⏳' : '✉'} Approve Outreach
        </button>

        <button
          disabled={!!loading}
          onClick={() => run('Report', () => trpcMutate('reports.regenerate', { prospectId }))}
          style={btnStyle('#0891b2')}
        >
          {loading === 'Report' ? '⏳' : '📄'} Regenerate Report
        </button>

        <button
          disabled={!!loading}
          onClick={() => run('Converted', () => trpcMutate('prospects.markConverted', { prospectId }))}
          style={btnStyle('#0891b2')}
        >
          {loading === 'Converted' ? '⏳' : '🏆'} Mark Converted
        </button>

        {threadId && threadPaused && (
          <button
            disabled={!!loading}
            onClick={() => run('Resume', () => trpcMutate('outreach.resumeThread', { threadId }))}
            style={btnStyle('#16a34a')}
          >
            {loading === 'Resume' ? '⏳' : '▶'} Resume Thread
          </button>
        )}
        {threadId && !threadPaused && !['COMPLETED', 'REPLIED', 'OPTED_OUT', 'BOUNCED', 'SUPPRESSED'].includes(threadState ?? '') && (
          <button
            disabled={!!loading}
            onClick={() => run('Pause', () => trpcMutate('outreach.pauseThread', { threadId, reason: 'manually paused' }))}
            style={btnStyle('#f59e0b')}
          >
            {loading === 'Pause' ? '⏳' : '⏸'} Pause Thread
          </button>
        )}
        {threadId && !['COMPLETED', 'REPLIED', 'OPTED_OUT', 'BOUNCED', 'SUPPRESSED'].includes(threadState ?? '') && (
          <button
            disabled={!!loading}
            onClick={() => run('Complete', () => trpcMutate('outreach.completeThread', { threadId }))}
            style={btnStyle('#64748b')}
          >
            {loading === 'Complete' ? '⏳' : '✓'} Complete Thread
          </button>
        )}

        <button
          disabled={!!loading}
          onClick={() => {
            if (!confirm('Suppress this prospect? This will add all contacts to the suppression list.')) return;
            run('Suppress', () => trpcMutate('prospects.suppress', { prospectId }));
          }}
          style={btnStyle('#dc2626')}
        >
          {loading === 'Suppress' ? '⏳' : '🚫'} Suppress
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#16a34a', background: '#f0fdf4', padding: '6px 10px', borderRadius: '4px' }}>
          ✓ {success} — reloading…
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: 'white',
    border: 'none',
    padding: '7px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  };
}
