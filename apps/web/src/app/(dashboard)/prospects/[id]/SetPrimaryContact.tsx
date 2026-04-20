'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../../../lib/trpc';

export default function SetPrimaryContact({ contactId, prospectId }: { contactId: string; prospectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const mutation = trpc.prospects.setContactPrimary.useMutation();

  async function handle() {
    setLoading(true);
    try {
      await mutation.mutateAsync({ contactId, prospectId });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => void handle()}
      disabled={loading}
      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
      title="Set as primary contact"
    >
      {loading ? '…' : '★'}
    </button>
  );
}
