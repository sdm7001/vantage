'use client';

import { useState, useEffect } from 'react';
import { trpc } from '../../../lib/trpc';

export default function SettingsPage() {
  const { data: config, isLoading } = trpc.settings.getBrandConfig.useQuery();
  const updateMutation = trpc.settings.updateBrandConfig.useMutation();

  const [form, setForm] = useState({
    companyName: 'TexMG',
    primaryColor: '#0f172a',
    accentColor: '#3b82f6',
    senderName: 'Scott',
    senderEmail: 'scott@texmg.com',
    bookingUrl: '',
  });

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (config) {
      setForm({
        companyName: config.companyName ?? 'TexMG',
        primaryColor: config.primaryColor ?? '#0f172a',
        accentColor: config.accentColor ?? '#3b82f6',
        senderName: config.senderName ?? 'Scott',
        senderEmail: config.senderEmail ?? 'scott@texmg.com',
        bookingUrl: config.bookingUrl ?? '',
      });
    }
  }, [config]);

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Primary Color" hint="Header background">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }} />
                <input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                  placeholder="#0f172a" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </Field>
            <Field label="Accent Color" hint="Buttons and highlights">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                  style={{ width: '40px', height: '36px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }} />
                <input value={form.accentColor} onChange={e => setForm(f => ({ ...f, accentColor: e.target.value }))}
                  placeholder="#3b82f6" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </Field>
          </div>
        </section>

        {/* Sender section */}
        <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Sender Profile</h2>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            The From name and reply-to shown in outreach emails. Must match a verified Resend sender.
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
                COMPLIMENTARY ANALYSIS BY {form.companyName.toUpperCase()}
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
