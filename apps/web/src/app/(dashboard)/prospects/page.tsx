'use client';

import { useState } from 'react';

// This page is a client-side shell — data is loaded via tRPC
// Full implementation uses trpc.prospects.list.useQuery()

export default function ProspectsPage() {
  const [domain, setDomain] = useState('');

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Prospects</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Audit websites and launch personalized outreach</p>
        </div>
      </div>

      {/* Add prospect form */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>Add a new prospect</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="acmeplumbing.com"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px 12px', fontSize: '14px' }}
          />
          <button
            style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
            onClick={() => {
              // trpc.prospects.create.mutate({ domain }) then triggerFullPipeline
              alert(`Would create prospect for: ${domain}`);
            }}
          >
            Add + Audit
          </button>
        </div>
      </div>

      {/* Prospect list placeholder */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</div>
        <div style={{ fontWeight: 600, color: '#475569', marginBottom: '8px' }}>No prospects yet</div>
        <div style={{ fontSize: '14px' }}>Add a domain above to run your first website audit.</div>
      </div>
    </div>
  );
}
