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

interface Props {
  reportId: string;
  prospectId: string;
  publicToken: string;
  reportStatus: string;
}

export default function ReportRowActions({ reportId, prospectId, publicToken, reportStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleRegenerate() {
    if (!confirm('Regenerate this report? A new version will be queued.')) return;
    setLoading(true);
    setError('');
    try {
      await trpcMutate('reports.regenerate', { prospectId });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try {
      await trpcMutate('reports.delete', { id: reportId });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      {reportStatus === 'ready' && (
        <>
          <a
            href={`/r/${publicToken}`}
            target="_blank"
            style={{
              fontSize: '11px', fontWeight: 600, color: '#1565C0',
              background: '#eff6ff', padding: '4px 10px', borderRadius: '5px',
              textDecoration: 'none', border: '1px solid #bfdbfe',
            }}
          >
            View
          </a>
          <a
            href={`/api/reports/${publicToken}?download=1`}
            style={{
              fontSize: '11px', fontWeight: 600, color: '#475569',
              background: '#f1f5f9', padding: '4px 10px', borderRadius: '5px',
              textDecoration: 'none', border: '1px solid #e2e8f0',
            }}
          >
            Download
          </a>
        </>
      )}
      {done ? (
        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Queued</span>
      ) : (
        <button
          disabled={loading}
          onClick={() => void handleRegenerate()}
          style={{
            fontSize: '11px', fontWeight: 600, color: '#7c3aed',
            background: '#f5f3ff', padding: '4px 10px', borderRadius: '5px',
            border: '1px solid #ddd6fe', cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? '…' : 'Regenerate'}
        </button>
      )}
      <button
        disabled={deleting}
        onClick={() => void handleDelete()}
        style={{
          fontSize: '11px', fontWeight: 600, color: '#b91c1c',
          background: '#fef2f2', padding: '4px 10px', borderRadius: '5px',
          border: '1px solid #fecaca', cursor: deleting ? 'default' : 'pointer',
        }}
      >
        {deleting ? '…' : 'Delete'}
      </button>
      {error && <span style={{ fontSize: '11px', color: '#dc2626' }}>{error}</span>}
    </div>
  );
}
