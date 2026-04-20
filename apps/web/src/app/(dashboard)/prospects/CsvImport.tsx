'use client';

import { useState, useRef } from 'react';
import { trpc } from '../../../lib/trpc';

export default function CsvImport({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [triggerPipeline, setTriggerPipeline] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = trpc.prospects.importCsv.useMutation();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsv((ev.target?.result as string) ?? '');
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!csv.trim()) return;
    setResult(null);
    try {
      const res = await mutation.mutateAsync({ csv, triggerPipeline });
      setResult(res);
      if (res.imported > 0) onImported();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
      >
        Import CSV
      </button>
    );
  }

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>Import Prospects from CSV</div>
        <button onClick={() => { setOpen(false); setCsv(''); setResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}>×</button>
      </div>

      <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px' }}>
        Required column: <code>domain</code> &nbsp;·&nbsp; Optional: <code>companyName</code>, <code>contactEmail</code>, <code>contactName</code>, <code>contactTitle</code>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginRight: '10px' }}
        >
          Choose file…
        </button>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>or paste CSV below</span>
      </div>

      <textarea
        value={csv}
        onChange={e => setCsv(e.target.value)}
        placeholder={'domain,companyName,contactEmail\nacmeplumbing.com,Acme Plumbing,john@acme.com\n...'}
        rows={5}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={triggerPipeline}
            onChange={e => setTriggerPipeline(e.target.checked)}
          />
          Auto-run full pipeline (enrich → audit → report) for each import
        </label>
      </div>

      {result && (
        <div style={{ marginTop: '12px', fontSize: '12px', padding: '8px 12px', borderRadius: '6px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
          ✓ Imported: <strong>{result.imported}</strong> &nbsp;·&nbsp; Skipped (duplicates): <strong>{result.skipped}</strong> &nbsp;·&nbsp; Failed: <strong>{result.failed}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button
          disabled={!csv.trim() || mutation.isPending}
          onClick={() => void handleImport()}
          style={{ background: mutation.isPending ? '#94a3b8' : '#1565C0', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: mutation.isPending ? 'default' : 'pointer' }}
        >
          {mutation.isPending ? 'Importing…' : 'Import'}
        </button>
        <button
          onClick={() => { setOpen(false); setCsv(''); setResult(null); }}
          style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
