import Link from 'next/link';
import AttributionTracker from './AttributionTracker';

const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://calendly.com/texmg';

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  dark:    '#0f172a',
  deep:    '#0a1122',
  card:    '#111d35',
  border:  '#1e293b',
  blue:    '#1565C0',   // TMG brand blue — buttons, strong accents
  blueSft: '#4a9fd4',   // readable on dark — text highlights
  txtPri:  '#ffffff',
  txtSec:  '#94a3b8',
  txtMid:  '#64748b',
  txtDim:  '#475569',
  txtFade: '#334155',
};

// ─── Content ──────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    label: 'Weak messaging',
    detail: 'Value propositions that don\'t resonate with buyers. Features listed, benefits buried. No clear reason to choose you over the competitor three links down.',
  },
  {
    label: 'Poor SEO foundation',
    detail: 'Missing schema, duplicate tags, thin pages, no local authority signals. Search engines aren\'t indexing your best work — because they can\'t find it.',
  },
  {
    label: 'Low trust signals',
    detail: 'Outdated design, stock photography, no credentials visible. First impressions determine whether a visitor reads further or bounces.',
  },
  {
    label: 'Not AI-search ready',
    detail: 'Competitors are getting cited by ChatGPT and Perplexity. If your content isn\'t structured for AI readability, you\'re invisible to the next generation of search.',
  },
];

const CATEGORIES = [
  {
    name: 'Content & Messaging',
    weight: '25%',
    findings: [
      'Value proposition buried below the fold',
      'No clear problem-solution framing',
      'Benefits hidden behind feature lists',
    ],
  },
  {
    name: 'UX / Conversion',
    weight: '20%',
    findings: [
      'Primary CTA invisible on mobile',
      'Contact form with too many required fields',
      'No social proof near conversion points',
    ],
  },
  {
    name: 'SEO Health',
    weight: '20%',
    findings: [
      'Missing or duplicate title tags',
      'No local business schema markup',
      'Internal links send no authority to key pages',
    ],
  },
  {
    name: 'Visual Design',
    weight: '15%',
    findings: [
      'Inconsistent typography across pages',
      'Generic stock photography reduces credibility',
      'Layout patterns last updated circa 2018',
    ],
  },
  {
    name: 'GEO / AI Search',
    weight: '15%',
    findings: [
      'No FAQ content for voice and AI search',
      'Weak E-E-A-T signals — author credentials missing',
      'Not structured for ChatGPT or Perplexity citation',
    ],
  },
  {
    name: 'Critical Issues',
    weight: 'penalty',
    findings: [
      'Broken links on core navigation',
      'Pages returning 404 with no redirect',
      'Missing mobile viewport configuration',
    ],
  },
];

const SERVICES = [
  {
    name: 'Website Redesign',
    tagline: 'A site that converts, not just looks good.',
    points: [
      'Built from audit findings — fixes real problems, not cosmetic ones',
      'Conversion-optimized layouts with clear CTAs and trust signals',
      'Fast, mobile-first — 90+ Core Web Vitals score guaranteed',
      'Content strategy included: value props, FAQs, service pages',
    ],
  },
  {
    name: 'SEO & Local Authority',
    tagline: 'Rank for searches your buyers actually make.',
    points: [
      'Technical SEO remediation — title tags, schema, site architecture',
      'Local SEO for Houston and target markets: GMB, citations',
      'Content gaps filled: blog posts, service pages, FAQ clusters',
      'Monthly reporting with keyword rank tracking',
    ],
  },
  {
    name: 'GEO / AI Search Optimization',
    tagline: 'Get cited by ChatGPT, Perplexity, and Google AI Overviews.',
    points: [
      'Structured data: FAQ, How-To, Organization, LocalBusiness',
      'E-E-A-T signals: author bios, credentials, trust indicators',
      'Content reformatted for AI readability and citation likelihood',
      'Tracked across AI platforms — not just Google',
    ],
  },
];

const FAQS = [
  {
    q: 'You already audited my site — what did you find?',
    a: 'We ran your site through our 36-dimension evaluation across content, UX, SEO, visual design, and AI search readiness. The full report is available — just reply to the email we sent, or book a call and we\'ll walk through the findings with you.',
  },
  {
    q: 'Is the audit report free?',
    a: 'Yes. We send the full branded PDF report at no charge, regardless of whether you hire us. If the findings are useful, great — if you want help fixing them, we can talk.',
  },
  {
    q: 'How long does a website redesign take?',
    a: 'Most projects: 4–6 weeks from kickoff to launch. We move fast because we start with your audit — we already know what to fix before day one.',
  },
  {
    q: 'Do you work with businesses outside Houston?',
    a: 'Yes. Most clients are Houston-area but we take on projects nationwide. Local SEO campaigns are strongest for companies serving a defined geographic market.',
  },
  {
    q: 'What does GEO optimization cost?',
    a: 'Pricing depends on site size and competitive landscape. Most GEO engagements start around $1,500/month with a 3-month minimum. We\'ll give you a fixed quote on the call.',
  },
  {
    q: 'How is TMG different from other agencies?',
    a: 'We lead with evidence. Before pitching anything, we audit your site and show you exactly what\'s broken. No hypotheticals, no feature lists — just a scored report with specific, prioritized fixes.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: T.dark, color: T.txtPri }}>
      <AttributionTracker />

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav style={{
        padding: '0 48px',
        height: '58px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${T.border}`,
        position: 'sticky',
        top: 0,
        background: 'rgba(15,23,42,0.97)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tmg-logo.svg" alt="TMG" style={{ height: '27px', width: 'auto' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { label: 'Process', href: '#process' },
              { label: 'Services', href: '#services' },
              { label: 'About', href: '#about' },
              { label: 'FAQ', href: '#faq' },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={{
                fontSize: '13px',
                color: T.txtMid,
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.15s',
              }}>
                {label}
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/sign-in" style={{
              fontSize: '13px',
              color: T.txtSec,
              textDecoration: 'none',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: '6px',
              border: `1px solid ${T.border}`,
            }}>
              Login
            </Link>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{
              fontSize: '13px',
              background: T.blue,
              color: 'white',
              padding: '7px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 700,
            }}>
              Book a Call
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '108px 48px 96px', maxWidth: '840px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          color: T.blueSft,
          marginBottom: '30px',
        }}>
          Audit-First Website Intelligence
        </div>
        <h1 style={{
          fontSize: '56px',
          fontWeight: 800,
          lineHeight: 1.07,
          marginBottom: '26px',
          letterSpacing: '-0.03em',
          color: 'white',
        }}>
          Your website is losing<br />
          business.{' '}
          <span style={{ color: T.blueSft }}>
            We&apos;ll show you<br />exactly why.
          </span>
        </h1>
        <p style={{
          fontSize: '17px',
          color: T.txtSec,
          maxWidth: '560px',
          margin: '0 auto 44px',
          lineHeight: 1.78,
        }}>
          TMG audits your website across 36 dimensions — content, UX, SEO, and AI search readiness.
          You get a scored report with prioritized, specific fixes.
          We build from evidence, not templates.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: T.blue,
              color: 'white',
              padding: '14px 36px',
              borderRadius: '7px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '-0.01em',
            }}
          >
            Book a Free Strategy Call →
          </a>
          <Link href="/sign-in" style={{
            background: 'transparent',
            color: T.txtSec,
            padding: '14px 28px',
            borderRadius: '7px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '15px',
            border: `1px solid ${T.border}`,
          }}>
            Client Portal →
          </Link>
        </div>
      </section>

      {/* ── Problem ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: T.deep,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        padding: '76px 48px',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '10px' }}>
            Most business websites share the same critical gaps
          </h2>
          <p style={{ color: T.txtMid, textAlign: 'center', fontSize: '15px', maxWidth: '480px', margin: '0 auto 52px', lineHeight: 1.65 }}>
            Symptoms vary. Root causes are predictable — and fixable.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '740px', margin: '0 auto' }}>
            {PROBLEMS.map(item => (
              <div key={item.label} style={{
                background: T.card,
                borderRadius: '9px',
                padding: '22px 24px',
                borderLeft: `3px solid ${T.blue}`,
              }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: 'white' }}>{item.label}</div>
                <div style={{ fontSize: '13px', color: T.txtMid, lineHeight: 1.72 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ─────────────────────────────────────────────────────────── */}
      <section id="process" style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '10px' }}>
            What we do before we ever reach out
          </h2>
          <p style={{ color: T.txtMid, fontSize: '15px', marginBottom: '52px', maxWidth: '500px', lineHeight: 1.65 }}>
            We audit first. You get specific findings — not a generic pitch.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              {
                n: '01',
                title: 'We crawl your site',
                sub: 'Playwright renders your pages like a real browser — JavaScript, dynamic content, mobile view — capturing screenshots and HTTP response data.',
              },
              {
                n: '02',
                title: 'Five AI agents evaluate in parallel',
                sub: 'Separate agents score Content, UX/CRO, SEO, Visual Design, and GEO/AI Search — 36 dimensions total. Each agent is specialized for its category.',
              },
              {
                n: '03',
                title: 'Findings get weighted and ranked',
                sub: 'Critical issues are penalized. P1 improvements are ranked by estimated impact. P2 refinements follow. Nothing is filler.',
              },
              {
                n: '04',
                title: 'A branded report is generated',
                sub: 'Your report includes your actual score, dimension breakdowns, annotated screenshots, specific fixes, and a 90-day action plan.',
              },
              {
                n: '05',
                title: 'We write a personalized outreach email',
                sub: 'The email references your specific issues by name — not a template. That\'s what you received if you found this page through our outreach.',
              },
            ].map((step, i, arr) => (
              <div key={step.n} style={{
                display: 'flex',
                gap: '32px',
                alignItems: 'flex-start',
                padding: '28px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: '#1e2f4a',
                  letterSpacing: '-0.02em',
                  minWidth: '40px',
                  lineHeight: 1,
                  paddingTop: '3px',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px', color: 'white' }}>{step.title}</div>
                  <div style={{ fontSize: '13px', color: T.txtMid, lineHeight: 1.72, maxWidth: '620px' }}>{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What we evaluate ────────────────────────────────────────────────── */}
      <section style={{
        background: T.deep,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        padding: '80px 48px',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '10px' }}>
            36 dimensions across six categories
          </h2>
          <p style={{ color: T.txtMid, textAlign: 'center', fontSize: '15px', maxWidth: '460px', margin: '0 auto 52px', lineHeight: 1.65 }}>
            Every report covers all six. These are the patterns we find most often.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {CATEGORIES.map(cat => (
              <div key={cat.name} style={{
                background: T.card,
                borderRadius: '8px',
                padding: '20px 20px',
                borderTop: `2px solid ${T.blue}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'white', lineHeight: 1.3 }}>{cat.name}</span>
                  <span style={{
                    fontSize: '10px',
                    background: T.dark,
                    color: T.txtDim,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    flexShrink: 0,
                  }}>
                    {cat.weight}
                  </span>
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 13px' }}>
                  {cat.findings.map(f => (
                    <li key={f} style={{ fontSize: '11px', color: T.txtMid, lineHeight: 1.65, marginBottom: '3px' }}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────────── */}
      <section id="services" style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '10px' }}>
            Three ways we fix it
          </h2>
          <p style={{ color: T.txtMid, fontSize: '15px', marginBottom: '52px', maxWidth: '480px', lineHeight: 1.65 }}>
            Every engagement starts from your audit findings. We know what to fix before we start.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
            {SERVICES.map(svc => (
              <div key={svc.name} style={{
                background: T.card,
                borderRadius: '10px',
                padding: '26px 22px',
                border: `1px solid ${T.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'white', marginBottom: '5px' }}>{svc.name}</div>
                  <div style={{ fontSize: '12px', color: T.blueSft, lineHeight: 1.5 }}>{svc.tagline}</div>
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 14px' }}>
                  {svc.points.map(p => (
                    <li key={p} style={{ fontSize: '12px', color: T.txtMid, lineHeight: 1.65, marginBottom: '5px' }}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About / Why TMG ─────────────────────────────────────────────────── */}
      <section id="about" style={{
        background: T.deep,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        padding: '80px 48px',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: T.blueSft, marginBottom: '16px' }}>
                Why TMG
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '20px', lineHeight: 1.2 }}>
                We lead with evidence.<br />Every time.
              </h2>
              <p style={{ color: T.txtMid, fontSize: '14px', lineHeight: 1.8, marginBottom: '18px' }}>
                Most agencies pitch first and ask questions later. We audit before we contact anyone.
                You get a complete picture of your site&apos;s strengths and weaknesses before a single dollar changes hands.
              </p>
              <p style={{ color: T.txtMid, fontSize: '14px', lineHeight: 1.8 }}>
                TMG has served Texas businesses for over a decade —
                website design, SEO, and now AI search optimization.
                The same systematic, evidence-first approach applies to every engagement.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {[
                { value: '10+', label: 'Years in Houston', sub: 'Serving Texas-based businesses since 2013' },
                { value: '36', label: 'Audit dimensions', sub: 'The most thorough website evaluation available' },
                { value: '3×', label: 'Avg. reply rate lift', sub: 'vs. agencies that don\'t lead with findings' },
              ].map(stat => (
                <div key={stat.value} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '30px', fontWeight: 800, color: T.blue, minWidth: '54px', letterSpacing: '-0.02em' }}>
                    {stat.value}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>{stat.label}</div>
                    <div style={{ fontSize: '12px', color: T.txtDim, marginTop: '2px', lineHeight: 1.5 }}>{stat.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '18px',
            marginTop: '52px',
            paddingTop: '48px',
            borderTop: `1px solid ${T.border}`,
          }}>
            {[
              {
                quote: 'We knew our site wasn\'t performing but didn\'t have specifics. The audit gave us a prioritized list. TexMG fixed the P0 issues in the first sprint and our Google rankings moved within 6 weeks.',
                name: 'Ops Director',
                company: 'Houston-area commercial contractor',
              },
              {
                quote: 'I\'ve talked to a dozen agencies. None of them showed me real data before the pitch. Scott sent an actual PDF with our scores broken down by category. That\'s why we hired them.',
                name: 'Owner',
                company: 'Texas HVAC services company',
              },
            ].map((t, i) => (
              <div key={i} style={{
                background: T.card,
                borderRadius: '10px',
                padding: '26px 28px',
                border: `1px solid ${T.border}`,
              }}>
                <p style={{ fontSize: '14px', lineHeight: 1.78, color: T.txtSec, fontStyle: 'italic', marginBottom: '14px' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ fontSize: '12px', color: T.txtDim }}>
                  <strong style={{ color: T.txtMid }}>{t.name}</strong> &mdash; {t.company}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '10px' }}>
            What fixing it looks like
          </h2>
          <p style={{ color: T.txtMid, fontSize: '15px', marginBottom: '48px', maxWidth: '480px', lineHeight: 1.65 }}>
            Three engagement models — all starting from your audit, not a template.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              {
                label: 'Website Redesign',
                price: 'From $4,500',
                timeline: '4–6 weeks',
                detail: 'Full redesign built from P0 findings. Conversion-optimized, mobile-first, 90+ Core Web Vitals. Content strategy included.',
                highlight: false,
              },
              {
                label: 'SEO & Local Authority',
                price: 'From $1,200/mo',
                timeline: '3-month minimum',
                detail: 'Technical SEO remediation, local GMB optimization, content gap filling, monthly rank tracking. Houston and Texas markets.',
                highlight: true,
              },
              {
                label: 'GEO / AI Search Optimization',
                price: 'From $1,500/mo',
                timeline: '3-month minimum',
                detail: 'Schema implementation, E-E-A-T signals, AI-readable content formatting. Tracked across ChatGPT, Perplexity, and Google AI Overviews.',
                highlight: false,
              },
            ].map(tier => (
              <div key={tier.label} style={{
                background: tier.highlight ? '#0d2040' : T.card,
                borderRadius: '9px',
                padding: '20px 24px',
                border: tier.highlight ? `1px solid ${T.blue}` : `1px solid ${T.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '20px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>{tier.label}</span>
                    {tier.highlight && (
                      <span style={{
                        fontSize: '10px',
                        background: T.blue,
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase',
                      }}>
                        Most Common
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: T.txtMid, lineHeight: 1.55 }}>{tier.detail}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: tier.highlight ? T.blueSft : T.txtSec }}>{tier.price}</div>
                  <div style={{ fontSize: '11px', color: T.txtDim, marginTop: '2px' }}>{tier.timeline}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: T.txtFade, marginTop: '16px' }}>
            Exact pricing depends on scope. We give you a fixed quote on the call — no hourly billing.
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" style={{
        background: T.deep,
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        padding: '80px 48px',
      }}>
        <div style={{ maxWidth: '660px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '44px' }}>
            Common questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {FAQS.map((faq, i, arr) => (
              <div key={faq.q} style={{
                padding: '22px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: 'white' }}>{faq.q}</div>
                <div style={{ fontSize: '13px', color: T.txtMid, lineHeight: 1.78 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portal Access ────────────────────────────────────────────────────── */}
      <section style={{
        background: T.card,
        borderBottom: `1px solid ${T.border}`,
        padding: '52px 48px',
      }}>
        <div style={{
          maxWidth: '720px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '32px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'white', marginBottom: '6px' }}>
              Already working with us?
            </div>
            <div style={{ fontSize: '13px', color: T.txtMid, maxWidth: '380px', lineHeight: 1.65 }}>
              Access your reports, audit results, and outreach campaign status in the operator portal.
            </div>
          </div>
          <Link href="/sign-in" style={{
            background: T.blue,
            color: 'white',
            padding: '12px 28px',
            borderRadius: '7px',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '14px',
            flexShrink: 0,
          }}>
            Log In to Portal →
          </Link>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '104px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            color: T.blueSft,
            marginBottom: '22px',
          }}>
            Free · No obligation · 30 minutes
          </div>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '18px', lineHeight: 1.12, letterSpacing: '-0.025em' }}>
            Let&apos;s walk through<br />your report together
          </h2>
          <p style={{ color: T.txtSec, fontSize: '16px', marginBottom: '22px', lineHeight: 1.78 }}>
            We&apos;ll review every finding, explain the impact, and give you a fixed quote.
            No pitch deck, no generic recommendations — just your report.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '36px', flexWrap: 'wrap' }}>
            {['Free audit already done', 'Fixed-price quotes', 'No long-term contracts required'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: T.txtDim }}>
                <span style={{ color: T.blue, fontWeight: 700 }}>✓</span> {t}
              </div>
            ))}
          </div>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: T.blue,
              color: 'white',
              padding: '16px 48px',
              borderRadius: '7px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '16px',
            }}
          >
            Book a Free Strategy Call →
          </a>
          <div style={{ marginTop: '16px', fontSize: '12px', color: T.txtFade }}>
            Or reply to our email &nbsp;·&nbsp;{' '}
            <a href="mailto:scott@texmg.com" style={{ color: T.txtDim, textDecoration: 'none' }}>scott@texmg.com</a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        padding: '24px 48px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: T.txtFade,
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tmg-logo.svg" alt="TMG" style={{ height: '18px', width: 'auto', opacity: 0.45 }} />
          <span>Houston, TX &nbsp;·&nbsp; Website Design, SEO &amp; GEO Optimization</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <a href="mailto:scott@texmg.com" style={{ color: T.txtFade, textDecoration: 'none' }}>scott@texmg.com</a>
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{ color: T.txtFade, textDecoration: 'none' }}>Book a call</a>
          <Link href="/sign-in" style={{ color: T.txtDim, textDecoration: 'none', fontWeight: 600 }}>Portal Login</Link>
        </div>
      </footer>
    </main>
  );
}
