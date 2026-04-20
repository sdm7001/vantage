'use client';

import { useState } from 'react';
import { trpc } from '../../../lib/trpc';

type IcpProfile = {
  id: string;
  name: string;
  industries: string[];
  cities: string[];
  states: string[];
  keywords: string[];
  minEmployees: number | null;
  maxEmployees: number | null;
  isDefault: boolean;
};

export default function SourcingPage() {
  const { data: profilesRaw, refetch } = trpc.sourcing.getProfiles.useQuery();
  const profiles = profilesRaw as IcpProfile[] | undefined;
  const createMutation = trpc.sourcing.createProfile.useMutation();
  const updateMutation = trpc.sourcing.updateProfile.useMutation();
  const deleteMutation = trpc.sourcing.deleteProfile.useMutation();
  const triggerMutation = trpc.sourcing.triggerSourcing.useMutation();
  const [triggerStatus, setTriggerStatus] = useState<Record<string, string>>({});

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    industries: '',
    cities: '',
    states: '',
    keywords: '',
    minEmployees: '',
    maxEmployees: '',
    isDefault: false,
  });
  const [error, setError] = useState('');

  async function handleRunSourcing(icpProfileId: string) {
    setTriggerStatus(s => ({ ...s, [icpProfileId]: 'running' }));
    try {
      await triggerMutation.mutateAsync({ icpProfileId, limit: 20 });
      setTriggerStatus(s => ({ ...s, [icpProfileId]: 'queued' }));
      setTimeout(() => setTriggerStatus(s => { const n = { ...s }; delete n[icpProfileId]; return n; }), 4000);
    } catch {
      setTriggerStatus(s => ({ ...s, [icpProfileId]: 'error' }));
    }
  }

  function startEdit(p: { id: string; name: string; industries: string[]; cities: string[]; states: string[]; keywords: string[]; minEmployees: number | null; maxEmployees: number | null; isDefault: boolean }) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      industries: p.industries.join(', '),
      cities: p.cities.join(', '),
      states: p.states.join(', '),
      keywords: p.keywords.join(', '),
      minEmployees: p.minEmployees != null ? String(p.minEmployees) : '',
      maxEmployees: p.maxEmployees != null ? String(p.maxEmployees) : '',
      isDefault: p.isDefault,
    });
    setError('');
  }

  async function handleUpdate(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    const industries = form.industries.split(',').map(s => s.trim()).filter(Boolean);
    if (industries.length === 0) { setError('At least one industry is required'); return; }
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        name: form.name.trim(),
        industries,
        cities: form.cities.split(',').map(s => s.trim()).filter(Boolean),
        states: form.states.split(',').map(s => s.trim()).filter(Boolean),
        keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean),
        minEmployees: form.minEmployees ? Number(form.minEmployees) : undefined,
        maxEmployees: form.maxEmployees ? Number(form.maxEmployees) : undefined,
        isDefault: form.isDefault,
      });
      setEditingId(null);
      setForm({ name: '', industries: '', cities: '', states: '', keywords: '', minEmployees: '', maxEmployees: '', isDefault: false });
      void refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }

  async function handleCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    const industries = form.industries.split(',').map(s => s.trim()).filter(Boolean);
    if (industries.length === 0) { setError('At least one industry is required'); return; }
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        industries,
        cities: form.cities.split(',').map(s => s.trim()).filter(Boolean),
        states: form.states.split(',').map(s => s.trim()).filter(Boolean),
        keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean),
        minEmployees: form.minEmployees ? Number(form.minEmployees) : undefined,
        maxEmployees: form.maxEmployees ? Number(form.maxEmployees) : undefined,
        isDefault: form.isDefault,
      });
      setShowForm(false);
      setForm({ name: '', industries: '', cities: '', states: '', keywords: '', minEmployees: '', maxEmployees: '', isDefault: false });
      void refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this ICP profile?')) return;
    await deleteMutation.mutateAsync({ id });
    void refetch();
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Prospect Sourcing</h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Define ICP profiles for AI-powered discovery. The sourcing agent searches for businesses matching your criteria.
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{ background: '#1565C0', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ New ICP Profile'}
        </button>
      </div>

      {/* How it works */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
        <strong style={{ color: '#475569' }}>How sourcing works:</strong> The sourcing agent builds search queries from your ICP fields, queries DuckDuckGo for matching businesses,
        extracts domains, and uses Claude Haiku to score each result against your ICP definition.
        Results with ≥ 50% confidence are added as prospects. Run sourcing from the CLI with{' '}
        <code style={{ background: '#e2e8f0', padding: '1px 5px', borderRadius: '3px' }}>/prospect source --icp=[profile-id]</code>.
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>New ICP Profile</h2>
          <form onSubmit={e => void handleCreate(e)}>
            <Field label="Profile name" required>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Houston HVAC — small business" style={inputStyle} required />
            </Field>
            <Field label="Industries" hint="comma-separated" required>
              <input value={form.industries} onChange={e => setForm(f => ({ ...f, industries: e.target.value }))} placeholder="HVAC, Plumbing, Electrical" style={inputStyle} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Cities" hint="optional, comma-separated">
                <input value={form.cities} onChange={e => setForm(f => ({ ...f, cities: e.target.value }))} placeholder="Houston, Sugar Land" style={inputStyle} />
              </Field>
              <Field label="States" hint="optional, comma-separated">
                <input value={form.states} onChange={e => setForm(f => ({ ...f, states: e.target.value }))} placeholder="TX, OK" style={inputStyle} />
              </Field>
            </div>
            <Field label="Keywords" hint="optional, comma-separated">
              <input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="residential, commercial, repair" style={inputStyle} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="Min employees" hint="optional">
                <input type="number" min={1} value={form.minEmployees} onChange={e => setForm(f => ({ ...f, minEmployees: e.target.value }))} placeholder="5" style={inputStyle} />
              </Field>
              <Field label="Max employees" hint="optional">
                <input type="number" min={1} value={form.maxEmployees} onChange={e => setForm(f => ({ ...f, maxEmployees: e.target.value }))} placeholder="50" style={inputStyle} />
              </Field>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', marginBottom: '16px' }}>
              <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
              Set as default ICP profile
            </label>
            {error && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '12px' }}>{error}</div>}
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{ background: createMutation.isPending ? '#94a3b8' : '#1565C0', color: 'white', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Profile list */}
      {!profiles?.length ? (
        <div style={{ background: 'white', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>No ICP profiles yet</div>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>Create a profile to define what types of businesses to target.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {profiles.map(p => (
            <div key={p.id} style={{ background: 'white', border: `1px solid ${editingId === p.id ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '10px', padding: '20px 24px' }}>
              {editingId === p.id ? (
                <form onSubmit={e => void handleUpdate(e)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Edit Profile</span>
                    <button type="button" onClick={() => { setEditingId(null); setError(''); }} style={{ background: 'none', border: 'none', fontSize: '13px', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                  </div>
                  <Field label="Profile name" required>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
                  </Field>
                  <Field label="Industries" hint="comma-separated" required>
                    <input value={form.industries} onChange={e => setForm(f => ({ ...f, industries: e.target.value }))} style={inputStyle} />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <Field label="Cities" hint="optional">
                      <input value={form.cities} onChange={e => setForm(f => ({ ...f, cities: e.target.value }))} style={inputStyle} />
                    </Field>
                    <Field label="States" hint="optional">
                      <input value={form.states} onChange={e => setForm(f => ({ ...f, states: e.target.value }))} style={inputStyle} />
                    </Field>
                  </div>
                  <Field label="Keywords" hint="optional">
                    <input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} style={inputStyle} />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <Field label="Min employees" hint="optional">
                      <input type="number" min={1} value={form.minEmployees} onChange={e => setForm(f => ({ ...f, minEmployees: e.target.value }))} style={inputStyle} />
                    </Field>
                    <Field label="Max employees" hint="optional">
                      <input type="number" min={1} value={form.maxEmployees} onChange={e => setForm(f => ({ ...f, maxEmployees: e.target.value }))} style={inputStyle} />
                    </Field>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', marginBottom: '16px' }}>
                    <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                    Set as default ICP profile
                  </label>
                  {error && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '12px' }}>{error}</div>}
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    style={{ background: updateMutation.isPending ? '#94a3b8' : '#1565C0', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                      {p.isDefault && (
                        <span style={{ fontSize: '10px', fontWeight: 700, background: '#eff6ff', color: '#1565C0', padding: '2px 7px', borderRadius: '10px' }}>DEFAULT</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                      {(p.industries as string[]).length > 0 && (
                        <span><strong style={{ color: '#475569' }}>Industries:</strong> {(p.industries as string[]).join(', ')}</span>
                      )}
                      {(p.cities as string[]).length > 0 && (
                        <span><strong style={{ color: '#475569' }}>Cities:</strong> {(p.cities as string[]).join(', ')}</span>
                      )}
                      {(p.states as string[]).length > 0 && (
                        <span><strong style={{ color: '#475569' }}>States:</strong> {(p.states as string[]).join(', ')}</span>
                      )}
                      {p.minEmployees && <span><strong style={{ color: '#475569' }}>Employees:</strong> {p.minEmployees}–{p.maxEmployees ?? '∞'}</span>}
                      {(p.keywords as string[]).length > 0 && (
                        <span><strong style={{ color: '#475569' }}>Keywords:</strong> {(p.keywords as string[]).join(', ')}</span>
                      )}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', background: '#f8fafc', padding: '5px 10px', borderRadius: '4px', display: 'inline-block' }}>
                      /prospect source --icp={p.id}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px', flexShrink: 0 }}>
                    <button
                      onClick={() => void handleRunSourcing(p.id)}
                      disabled={triggerStatus[p.id] === 'running'}
                      style={{ background: triggerStatus[p.id] === 'queued' ? '#16a34a' : triggerStatus[p.id] === 'error' ? '#dc2626' : '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {triggerStatus[p.id] === 'running' ? '⏳ Running…' : triggerStatus[p.id] === 'queued' ? '✓ Queued' : triggerStatus[p.id] === 'error' ? '✗ Error' : '▶ Run'}
                    </button>
                    <button
                      onClick={() => startEdit(p)}
                      style={{ background: 'none', border: '1px solid #bfdbfe', color: '#1565C0', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDelete(p.id)}
                      style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
        {hint && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '6px' }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #d1d5db', borderRadius: '6px',
  padding: '8px 10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};
