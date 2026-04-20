'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../../../lib/trpc';

export default function RemoveContact({ contactId, prospectId }: { contactId: string; prospectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mutation = trpc.prospects.removeContact.useMutation();

  async function handle() {
    if (!confirm('Remove this contact?')) return;
    setLoading(true);
    setError('');
    try {
      await mutation.mutateAsync({ contactId, prospectId });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span>
      <button
        onClick={() => void handle()}
        disabled={loading}
        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
        title="Remove contact"
      >
        {loading ? '…' : '×'}
      </button>
      {error && <span style={{ fontSize: '10px', color: '#dc2626', marginLeft: '4px' }}>{error}</span>}
    </span>
  );
}
