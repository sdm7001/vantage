import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Left panel — brand context */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        flex: '0 0 420px',
        borderRight: '1px solid #1e293b',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '48px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tmg-logo.png" alt="TMG" style={{ height: '32px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </Link>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4a9fd4', marginBottom: '16px' }}>
            Operator Portal
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.25, margin: '0 0 16px' }}>
            Campaign &amp; Outreach Management
          </h1>
          <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, margin: '0 0 40px' }}>
            Access the TMG portal to manage prospects, outreach campaigns, reports, and pipeline activity.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              'Prospect pipeline and enrichment',
              'Outreach approval and campaign management',
              'Report generation and delivery',
              'Jobs and pipeline observability',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1565C0', flexShrink: 0 }} />
                <span style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.4 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '48px' }}>
          <Link href="/" style={{ color: '#334155', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ← Back to TMG website
          </Link>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        background: '#080f1c',
      }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', marginBottom: '6px' }}>Sign in to your account</div>
          <div style={{ fontSize: '14px', color: '#475569' }}>Authorized team members only</div>
        </div>

        <SignIn
          fallbackRedirectUrl="/analytics"
          appearance={{
            variables: {
              colorPrimary: '#1565C0',
              colorBackground: '#0f172a',
              colorText: '#f1f5f9',
              colorTextSecondary: '#94a3b8',
              colorInputBackground: '#111d35',
              colorInputText: '#f1f5f9',
              borderRadius: '8px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            },
            elements: {
              card: { boxShadow: 'none', border: '1px solid #1e293b', background: '#0f172a' },
              headerTitle: { display: 'none' },
              headerSubtitle: { display: 'none' },
              formButtonPrimary: { background: '#1565C0', fontWeight: 700, fontSize: '14px' },
              footerActionLink: { color: '#4a9fd4' },
              footer: { display: 'none' },
            },
          }}
        />
      </div>
    </main>
  );
}
