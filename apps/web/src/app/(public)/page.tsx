import Link from 'next/link';

const AUDIT_CATEGORIES = [
  { icon: '✍️', name: 'Content & Messaging', weight: '25%', example: 'Value proposition buried below the fold, no problem-solution framing' },
  { icon: '🖱️', name: 'UX / Conversion', weight: '20%', example: 'CTA invisible on mobile, 3-step form instead of 1, no social proof' },
  { icon: '🔍', name: 'SEO Health', weight: '20%', example: 'Missing title tags, no local schema markup, duplicate H1s' },
  { icon: '🎨', name: 'Visual Design', weight: '15%', example: 'Inconsistent typography, stock photos, outdated layout patterns' },
  { icon: '🤖', name: 'GEO / AI Search', weight: '15%', example: 'No FAQ content, weak E-E-A-T signals, missing structured data' },
  { icon: '⚠️', name: 'Critical Issues', weight: 'penalty', example: 'Broken links, missing SSL, 404 on homepage, no mobile viewport' },
];

export default function LandingPage() {
  return (
    <main style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0f172a', color: 'white' }}>

      {/* Nav */}
      <nav style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6' }}>Vantage</span>
          <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px' }}>by TexMG</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/sign-in" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Sign in</Link>
          <Link href="/sign-up" style={{ background: '#3b82f6', color: 'white', padding: '8px 18px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 40px 80px', maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#1e3a5f', color: '#60a5fa', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', marginBottom: '24px' }}>
          AUDIT-FIRST OUTREACH
        </div>
        <h1 style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em' }}>
          Your prospects&apos; websites<br />
          are broken.{' '}
          <span style={{ color: '#3b82f6' }}>We prove it<br />before you pitch.</span>
        </h1>
        <p style={{ fontSize: '20px', color: '#94a3b8', marginBottom: '40px', maxWidth: '620px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          Vantage audits any prospect's site across 36 dimensions, generates a branded PDF report
          with real findings, and writes a personalized cold email — all before you send a single message.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/sign-up" style={{ background: '#3b82f6', color: 'white', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '16px' }}>
            Start Auditing Free →
          </Link>
          <Link href="/sign-in" style={{ background: '#1e293b', color: '#94a3b8', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '16px', border: '1px solid #334155' }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* Problem */}
      <section style={{ background: '#1e293b', padding: '80px 40px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', marginBottom: '12px' }}>
            Why cold outreach fails
          </h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: '16px', marginBottom: '48px' }}>
            Generic emails get ignored. Vantage gives you specific, provable ammunition.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { icon: '🗑️', title: 'Generic emails get deleted', body: 'Prospects receive 50+ cold emails a week. Without a specific hook, yours disappears.' },
              { icon: '🤔', title: 'Claims without evidence', body: '"We improve websites" means nothing. Showing their 3 P0 issues changes the conversation.' },
              { icon: '😶', title: 'You don\'t know what to say', body: 'Without knowing their actual site problems, every email sounds the same.' },
            ].map(card => (
              <div key={card.title} style={{ background: '#0f172a', borderRadius: '10px', padding: '24px' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{card.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px' }}>{card.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>{card.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 40px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', marginBottom: '12px' }}>How it works</h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: '16px', marginBottom: '48px' }}>Five steps from domain to sent email.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { n: '1', title: 'Add a domain', sub: 'Paste any prospect URL — or import a CSV of 100 domains at once.' },
              { n: '2', title: '5 AI agents audit in parallel', sub: 'Content, UX/CRO, SEO, Visual Design, and GEO agents evaluate 36 dimensions simultaneously using Claude.' },
              { n: '3', title: 'Branded PDF report generated', sub: 'A polished, TexMG-branded PDF with real findings, score cards, and a 90-day action plan — emailed or shared via link.' },
              { n: '4', title: 'Outreach email written from findings', sub: 'Claude drafts a personalized cold email referencing the prospect\'s specific P0 issues. You review before anything sends.' },
              { n: '5', title: 'You approve — Resend delivers it', sub: 'Daily cap enforced (10 new outbound/day). Follow-ups at Day +3, +7, +14, +21 run automatically.' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', background: '#1e293b', borderRadius: '10px', padding: '20px 24px' }}>
                <div style={{ width: '36px', height: '36px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', flexShrink: 0 }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{step.title}</div>
                  <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audit categories */}
      <section style={{ background: '#1e293b', padding: '80px 40px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', marginBottom: '12px' }}>
            36 dimensions across 6 categories
          </h2>
          <p style={{ color: '#64748b', textAlign: 'center', fontSize: '16px', marginBottom: '48px' }}>
            Every audit scores the things that actually drive leads and revenue.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {AUDIT_CATEGORIES.map(cat => (
              <div key={cat.name} style={{ background: '#0f172a', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '22px' }}>{cat.icon}</span>
                  <span style={{ fontSize: '11px', background: '#1e293b', color: '#64748b', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                    {cat.weight}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>{cat.name}</div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, fontStyle: 'italic' }}>&ldquo;{cat.example}&rdquo;</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '80px 40px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center' }}>
          {[
            { value: '36', label: 'Audit dimensions', sub: 'per website' },
            { value: '5', label: 'AI agents', sub: 'running in parallel' },
            { value: '~90s', label: 'Full audit time', sub: 'crawl to scored report' },
          ].map(stat => (
            <div key={stat.value}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#3b82f6' }}>{stat.value}</div>
              <div style={{ fontWeight: 700, fontSize: '16px', marginTop: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#1e3a5f', padding: '80px 40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px' }}>
          Ready to audit your first prospect?
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px' }}>
          Add any domain and get a full 36-dimension audit with a branded PDF report in under 2 minutes.
        </p>
        <Link href="/sign-up" style={{ background: '#3b82f6', color: 'white', padding: '16px 40px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '18px' }}>
          Start Auditing Free →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 40px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#475569' }}>
        <div>
          <span style={{ fontWeight: 700, color: '#3b82f6' }}>Vantage</span> by TexMG — Houston, TX
        </div>
        <div>
          <a href="mailto:scott@texmg.com" style={{ color: '#475569', textDecoration: 'none' }}>scott@texmg.com</a>
        </div>
      </footer>
    </main>
  );
}
