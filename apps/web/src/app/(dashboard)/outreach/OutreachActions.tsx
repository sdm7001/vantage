'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function trpcMutate(path: string, input: unknown) {
  const res = await fetch(`/api/trpc/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function ApproveButton({
  prospectId,
  campaignId,
  campaigns,
}: {
  prospectId: string;
  campaignId?: string;
  campaigns?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaignId ?? '');

  async function handle() {
    setLoading(true);
    setError('');
    try {
      await trpcMutate('outreach.approveInitial', {
        prospectId,
        ...(selectedCampaignId ? { campaignId: selectedCampaignId } : {}),
      });
      setDone(true);
      setTimeout(() => router.refresh(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (done) return <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>✓ Queued</span>;

  const showPicker = campaigns && campaigns.length > 1;
  const singleCampaign = campaigns?.length === 1 ? campaigns[0] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {singleCampaign && (
        <span style={{ fontSize: '10px', color: '#64748b' }}>
          Campaign: <strong>{singleCampaign.name}</strong>
        </span>
      )}
      {showPicker && (
        <select
          value={selectedCampaignId}
          onChange={e => setSelectedCampaignId(e.target.value)}
          style={{
            fontSize: '11px', padding: '4px 6px', borderRadius: '4px',
            border: '1px solid #e2e8f0', color: '#334155', background: 'white',
          }}
        >
          <option value="">No campaign</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      <button
        disabled={loading}
        onClick={() => void handle()}
        style={{
          background: loading ? '#94a3b8' : '#16a34a',
          color: 'white', border: 'none', padding: '6px 14px',
          borderRadius: '5px', fontSize: '12px', fontWeight: 700,
          cursor: loading ? 'default' : 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {loading ? '⏳' : '✉ Approve & Send'}
      </button>
      {error && <span style={{ fontSize: '11px', color: '#dc2626' }}>{error}</span>}
    </div>
  );
}

export function CompleteButton({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handle() {
    if (!confirm('Mark this thread as completed? Follow-ups will stop.')) return;
    setLoading(true);
    setError('');
    try {
      await trpcMutate('outreach.completeThread', { threadId });
      setDone(true);
      setTimeout(() => router.refresh(), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (done) return <span style={{ fontSize: '11px', color: '#64748b' }}>Closed</span>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <button
        disabled={loading}
        onClick={() => void handle()}
        style={{
          background: 'none', border: '1px solid #e2e8f0', color: '#64748b',
          padding: '4px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? '…' : 'Complete'}
      </button>
      {error && <span style={{ fontSize: '10px', color: '#dc2626' }}>{error}</span>}
    </div>
  );
}

export function PauseResumeButton({ threadId, isPaused }: { threadId: string; isPaused: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(isPaused);
  const [error, setError] = useState('');

  async function handle() {
    setLoading(true);
    setError('');
    try {
      if (paused) {
        await trpcMutate('outreach.resumeThread', { threadId });
      } else {
        await trpcMutate('outreach.pauseThread', { threadId, reason: 'manually paused' });
      }
      setPaused(p => !p);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <button
        disabled={loading}
        onClick={() => void handle()}
        style={{
          background: paused ? '#1565C0' : '#f59e0b',
          color: 'white', border: 'none', padding: '5px 12px',
          borderRadius: '5px', fontSize: '11px', fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? '…' : paused ? '▶ Resume' : '⏸ Pause'}
      </button>
      {error && <span style={{ fontSize: '11px', color: '#dc2626' }}>{error}</span>}
    </div>
  );
}
