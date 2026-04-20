'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function trpcMutate(path: string, input: unknown) {
  const res = await fetch(`/api/trpc/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: input }),
  });
  if (!res.ok) throw new Error(await res.text() || `Request failed: ${res.status}`);
  return res.json();
}

export default function CampaignStatusButton({
  campaignId,
  currentStatus,
}: {
  campaignId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (currentStatus === 'archived') return null;

  async function setStatus(status: 'active' | 'paused' | 'archived') {
    if (status === 'archived' && !confirm('Archive this campaign? This cannot be undone.')) return;
    setLoading(true);
    try {
      await trpcMutate('campaigns.setStatus', { id: campaignId, status });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus === 'active') {
    return (
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          disabled={loading}
          onClick={() => void setStatus('paused')}
          style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
        >
          {loading ? '…' : 'Pause'}
        </button>
        <button
          disabled={loading}
          onClick={() => void setStatus('archived')}
          style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: 'white', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
        >
          Archive
        </button>
      </div>
    );
  }

  // paused
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <button
        disabled={loading}
        onClick={() => void setStatus('active')}
        style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', background: 'white', color: '#16a34a', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
      >
        {loading ? '…' : 'Resume'}
      </button>
      <button
        disabled={loading}
        onClick={() => void setStatus('archived')}
        style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: 'white', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
      >
        Archive
      </button>
    </div>
  );
}
