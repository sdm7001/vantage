import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px 20px',
    }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tmg-logo.svg" alt="TMG" style={{ height: '34px', width: 'auto' }} />
        <p style={{ color: '#475569', fontSize: '12px', marginTop: '8px', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
          Operator Portal
        </p>
      </div>

      <SignIn
        fallbackRedirectUrl="/analytics"
        appearance={{
          variables: {
            colorPrimary: '#1565C0',
            colorBackground: '#111d35',
            colorText: '#f1f5f9',
            colorTextSecondary: '#94a3b8',
            colorInputBackground: '#162033',
            colorInputText: '#f1f5f9',
            borderRadius: '8px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          elements: {
            card: { boxShadow: '0 0 0 1px #1e293b', border: '1px solid #1e293b' },
            headerTitle: { color: '#ffffff' },
            headerSubtitle: { color: '#64748b' },
            formButtonPrimary: { background: '#1565C0', fontWeight: 700 },
            footerActionLink: { color: '#4a9fd4' },
          },
        }}
      />

      <div style={{ marginTop: '28px', textAlign: 'center' }}>
        <Link href="/" style={{ color: '#334155', fontSize: '12px', textDecoration: 'none' }}>
          ← Back to TMG
        </Link>
      </div>
    </main>
  );
}
