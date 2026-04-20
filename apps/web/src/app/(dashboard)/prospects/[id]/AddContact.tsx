'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../../../lib/trpc';

export default function AddContact({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', title: '', isPrimary: false });
  const [error, setError] = useState('');

  const mutation = trpc.prospects.addContact.useMutation();

  async function handleAdd(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    if (!form.email.trim()) { setError('Email is required'); return; }
    try {
      await mutation.mutateAsync({ prospectId, ...form, email: form.email.trim() });
      setForm({ firstName: '', lastName: '', email: '', title: '', isPrimary: false });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ width: '100%', marginTop: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '7px', fontSize: '12px', color: '#64748b', cursor: 'pointer', fontWeight: 500 }}
      >
        + Add contact
      </button>
    );
  }

  return (
    <form onSubmit={e => void handleAdd(e)} style={{ marginTop: '10px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>Add contact</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" style={inp} />
        <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" style={inp} />
      </div>
      <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email *" type="email" required style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: '8px' }} />
      <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (optional)" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: '8px' }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', marginBottom: '10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))} />
        Set as primary contact
      </label>
      {error && <div style={{ fontSize: '11px', color: '#dc2626', marginBottom: '8px' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button type="submit" disabled={mutation.isPending} style={{ flex: 1, background: mutation.isPending ? '#94a3b8' : '#1565C0', color: 'white', border: 'none', borderRadius: '5px', padding: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          {mutation.isPending ? 'Adding…' : 'Add'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(''); }} style={{ padding: '6px 10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const inp: React.CSSProperties = { border: '1px solid #d1d5db', borderRadius: '5px', padding: '6px 8px', fontSize: '12px', outline: 'none' };
