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

export default function CampaignActions() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await trpcMutate('campaigns.create', { name: name.trim(), dailyNewLimit: limit });
      setShowForm(false);
      setName('');
      setLimit(10);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  }

  if (showForm) {
    return (
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', minWidth: '300px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>New Campaign</div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Campaign name"
          autoFocus
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>Daily cap:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            style={{ width: '80px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
          />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>initial emails/day</span>
        </div>
        {error && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '10px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={create}
            disabled={loading || !name.trim()}
            style={{ flex: 1, background: '#1565C0', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
          <button
            onClick={() => setShowForm(false)}
            style={{ padding: '8px 14px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      style={{ background: '#1565C0', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
    >
      + New Campaign
    </button>
  );
}
