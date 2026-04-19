import Link from 'next/link';

export default function LandingPage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: 'white', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ padding: '80px 40px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: '#3b82f6', fontSize: '12px', letterSpacing: '2px', fontWeight: 700, marginBottom: '16px' }}>
          VANTAGE BY TEXMG
        </p>
        <h1 style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1.15, marginBottom: '24px' }}>
          Your prospects&apos; websites are broken.<br />
          <span style={{ color: '#3b82f6' }}>We prove it before you pitch.</span>
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          Vantage audits prospect websites across 36 dimensions, generates a branded PDF report,
          and writes a personalized outreach email — all before you send a single message.
        </p>
        <Link
          href="/sign-in"
          style={{ background: '#3b82f6', color: 'white', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}
        >
          Get Started →
        </Link>
      </section>

      {/* How it works */}
      <section style={{ background: '#1e293b', padding: '60px 40px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '40px' }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '24px' }}>
            {[
              { n: '1', title: 'Add a domain', desc: 'Paste any prospect\'s website URL' },
              { n: '2', title: 'Audit runs', desc: '5 AI agents evaluate 36 dimensions in parallel' },
              { n: '3', title: 'Report generated', desc: 'Branded PDF with real findings' },
              { n: '4', title: 'Email written', desc: 'Personalized outreach from audit insights' },
              { n: '5', title: 'You review & send', desc: 'Approve and Resend delivers it' },
            ].map(step => (
              <div key={step.n} style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 700 }}>
                  {step.n}
                </div>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>{step.title}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Ready to audit your first prospect?</h2>
        <Link
          href="/sign-up"
          style={{ background: '#3b82f6', color: 'white', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}
        >
          Start Auditing Free
        </Link>
      </section>
    </main>
  );
}
