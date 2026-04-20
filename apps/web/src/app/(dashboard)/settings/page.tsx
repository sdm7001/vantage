'use client';

import { useState, useEffect } from 'react';
import { trpc } from '../../../lib/trpc';

export default function SettingsPage() {
  const { data: config, isLoading } = trpc.settings.getBrandConfig.useQuery();
  const updateMutation = trpc.settings.updateBrandConfig.useMutation();
  const { data: suppressions, refetch: refetchSuppressions } = trpc.settings.getSuppressions.useQuery({ limit: 200 });
  const removeSuppressionMutation = trpc.settings.removeSuppression.useMutation();
  const addSuppressionMutation = trpc.settings.addSuppression.useMutation();
  const [suppressForm, setSuppressForm] = useState({ value: '', type: 'EMAIL' as 'EMAIL' | 'DOMAIN' });
  const [suppressError, setSuppressError] = useState('');

  const [form, setForm] = useState({
    companyName: 'TexMG',
    primaryColor: '#8B1E1E',
    accentColor: '#1565C0',
    senderName: 'Scott',
    senderEmail: 'scott@texmg.com',
    bookingUrl: '',
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');

  useEffect(() => {
    if (config) {
      setForm({
        companyName: config.companyName ?? 'TexMG',
        primaryColor: config.primaryColor ?? '#8B1E1E',
        accentColor: config.accentColor ?? '#1565C0',
        senderName: config.senderName ?? 'Scott',
        senderEmail: config.senderEmail ?? 'scott@texmg.com',
        bookingUrl: config.bookingUrl ?? '',
      });
      if (config.logoUrl) setLogoUrl(config.logoUrl);
    }
  }, [config]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/logo', { method: 'POST', body: fd });
      if (!res.ok) { setLogoError('Upload failed'); return; }
      const { url } = await res.json() as { url: string };
      setLogoUrl(url);
    } catch {
      setLogoError('Upload failed');
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleAddSuppression(e: React.SyntheticEvent) {
    e.preventDefault();
    const v = suppressForm.value.trim();
    if (!v) return;
    setSuppressError('');
    try {
      await addSuppressionMutation.mutateAsync({ value: v, type: suppressForm.type });
      setSuppressForm(f => ({ ...f, value: '' }));
      void refetchSuppressions();
    } catch (err) {
      setSuppressError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleSave(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await updateMutation.mutateAsync(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (isLoading) return <div style={{ padding: '32px', color: '#94a3b8' }}>Loading…</div>;

  return (
    <div style={{ padding: '32px', maxWidth: '680px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Settings</h1>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '28px' }}>
        Brand identity and sender details used in reports and outreach emails.
      </p>

      <form onSubmit={e => void handleSave(e)}>

        {/* Brand section */}
        <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Brand Identity</h2>

          <Field label="Company Name" hint="Appears on reports and emails">
            <input
              value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              style={inputStyle}
            />
          </Field>

          <Field label="Logo" hint="PNG, JPG, WebP or SVG · max 2 MB">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {logoUrl && (
                <img src={logoUrl} alt="Logo preview" style={{ height: '40px', maxWidth: '120px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px' }} />
              )}
              <label style={{ cursor: 'pointer' }}>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} style={{ display: 'none' }} />
                <span style={{ display: 'inline-block', padding: '7px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  {logoUploading ? 'Uploading…' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
                </span>
              </label>
              {logoError && <span style={{ fontSize: '12px', color: '#dc2626' }}>{logoError}</span>}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Primary Color" hint="Header background">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }} />
                <input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  placeholder="#8B1E1E" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </Field>
            <Field label="Accent Color" hint="Buttons and highlights">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                  style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }} />
                <input value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                  placeholder="#1565C0" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </Field>
          </div>
        </section>

        {/* Sender section */}
        <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Sender Profile</h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            The From name and reply-to shown in outreach emails. Must match a verified Microsoft 365 sender mailbox.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="From Name">
              <input
                value={form.senderName}
                onChange={e => setForm(f => ({ ...f, senderName: e.target.value }))}
                placeholder="Scott"
                style={inputStyle}
              />
            </Field>
            <Field label="From Email">
              <input
                type="email"
                value={form.senderEmail}
                onChange={e => setForm(f => ({ ...f, senderEmail: e.target.value }))}
                placeholder="scott@texmg.com"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Booking URL" hint="Calendly or other scheduling link for report CTAs">
            <input
              value={form.bookingUrl}
              onChange={e => setForm(f => ({ ...f, bookingUrl: e.target.value }))}
              placeholder="https://calendly.com/..."
              style={inputStyle}
            />
          </Field>
        </section>

        {/* Preview */}
        <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Report Header Preview
          </h2>
          <div style={{ background: form.primaryColor, color: 'white', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: form.accentColor, letterSpacing: '2px', fontWeight: 700 }}>
                WEBSITE AUDIT BY {form.companyName.toUpperCase()}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>Website Marketing Audit</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Prospect Company Name</div>
            </div>
            <div style={{ background: form.accentColor, color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
              ↓ Download PDF
            </div>
          </div>
        </section>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            style={{ background: updateMutation.isPending ? '#94a3b8' : '#0f172a', color: 'white', border: 'none', borderRadius: '6px', padding: '10px 24px', fontWeight: 600, fontSize: '14px', cursor: updateMutation.isPending ? 'default' : 'pointer' }}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>✓ Saved</span>}
          {error && <span style={{ fontSize: '13px', color: '#dc2626' }}>{error}</span>}
        </div>
      </form>

      {/* Suppression list */}
      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', marginTop: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Suppression List</h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
          Emails and domains that will never receive outreach. Added automatically on unsubscribe or bounce.
        </p>

        {/* Manual add form */}
        <form onSubmit={e => void handleAddSuppression(e)} style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <select
            value={suppressForm.type}
            onChange={e => setSuppressForm(f => ({ ...f, type: e.target.value as 'EMAIL' | 'DOMAIN' }))}
            style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', background: 'white', cursor: 'pointer' }}
          >
            <option value="EMAIL">Email</option>
            <option value="DOMAIN">Domain</option>
          </select>
          <input
            value={suppressForm.value}
            onChange={e => setSuppressForm(f => ({ ...f, value: e.target.value }))}
            placeholder={suppressForm.type === 'EMAIL' ? 'contact@example.com' : 'example.com'}
            style={{ flex: 1, minWidth: '200px', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={addSuppressionMutation.isPending || !suppressForm.value.trim()}
            style={{ background: addSuppressionMutation.isPending ? '#94a3b8' : '#0f172a', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {addSuppressionMutation.isPending ? '…' : '+ Suppress'}
          </button>
          {suppressError && <div style={{ width: '100%', fontSize: '11px', color: '#dc2626' }}>{suppressError}</div>}
        </form>

        {!suppressions?.length ? (
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>No suppressed addresses.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(suppressions as Array<{ id: string; type: string; value: string; reason: string | null; createdAt: Date }>).map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginRight: '8px' }}>{s.type}</span>
                  <span style={{ fontSize: '13px', color: '#1e293b' }}>{s.value}</span>
                  {s.reason && <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>· {s.reason}</span>}
                </div>
                <button
                  onClick={async () => {
                    await removeSuppressionMutation.mutateAsync({ id: s.id });
                    void refetchSuppressions();
                  }}
                  style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '6px' }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  padding: '8px 10px',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};
