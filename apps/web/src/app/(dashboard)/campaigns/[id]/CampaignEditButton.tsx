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

export default function CampaignEditButton({
  campaignId,
  currentName,
  currentLimit,
}: {
  campaignId: string;
  currentName: string;
  currentLimit: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [limit, setLimit] = useState(currentLimit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await trpcMutate('campaigns.update', { id: campaignId, name: name.trim(), dailyNewLimit: limit });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}
      >
        Edit
      </button>
    );
  }

  return (
    <form onSubmit={e => void handleSave(e)} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
        style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 10px', fontSize: '13px', fontWeight: 600, width: '200px', outline: 'none' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Cap:</span>
        <input
          type="number"
          min={1}
          max={50}
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
          style={{ width: '60px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 8px', fontSize: '13px', outline: 'none' }}
        />
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>/day</span>
      </div>
      <button
        type="submit"
        disabled={loading || !name.trim()}
        style={{ background: loading ? '#94a3b8' : '#0f172a', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
      >
        {loading ? '…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setName(currentName); setLimit(currentLimit); }}
        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', padding: '5px' }}
      >
        Cancel
      </button>
      {error && <span style={{ fontSize: '11px', color: '#dc2626', width: '100%' }}>{error}</span>}
    </form>
  );
}
