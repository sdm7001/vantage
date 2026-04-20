import Link from 'next/link';
import AttributionTracker from './AttributionTracker';

const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://cal.com/scott-mcauley-qe0mup/15min';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  navy:    '#0f172a',
  navyMid: '#1e293b',
  blue:    '#1565C0',
  blueSft: '#4a9fd4',
  white:   '#ffffff',
  offWhite:'#f8fafc',
  border:  '#e2e8f0',
  txtPri:  '#0f172a',
  txtSec:  '#475569',
  txtMid:  '#64748b',
  txtFade: '#94a3b8',
};

// ─── Helper components ─────────────────────────────────────────────────────────
const Eyebrow = ({ text, light = false }: { text: string; light?: boolean }) => (
  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: light ? '#4a9fd4' : T.blue, marginBottom: '14px' }}>
    {text}
  </div>
);

// ─── Data ─────────────────────────────────────────────────────────────────────
const PROBLEMS = [
  { icon: '🏚', title: 'Outdated design', body: 'A dated site signals neglect. First impressions drive buying decisions before a visitor reads a single word.' },
  { icon: '📢', title: 'Weak messaging', body: 'Features listed, benefits buried. Visitors leave when they cannot quickly understand why you are the right choice.' },
  { icon: '📱', title: 'Poor mobile UX', body: 'Over 60% of business searches happen on mobile. A broken mobile experience loses leads before you know they existed.' },
  { icon: '📉', title: 'Low conversion', body: 'Traffic without conversion is expensive noise. Buried CTAs, too many form fields, and absent social proof kill outcomes.' },
  { icon: '🔍', title: 'Weak SEO foundation', body: 'Missing schema, thin pages, no local authority. Search engines cannot rank what they struggle to understand.' },
  { icon: '🤖', title: 'Not AI-search ready', body: 'ChatGPT, Perplexity, and Google AI Overviews are changing how buyers find vendors. Unstructured content gets ignored.' },
];

const SERVICES = [
  { title: 'Website Review', body: 'A scored, structured analysis of your site across six dimensions — not a generic checklist, a real evaluation specific to your business.' },
  { title: 'Redesign Strategy', body: 'Prioritized recommendations for layout, messaging, visual design, and UX based on what actually moves conversions for your industry.' },
  { title: 'SEO Recommendations', body: 'Technical and content SEO gaps identified and ranked. From meta tags and schema to internal linking and local authority signals.' },
  { title: 'GEO / AI-Search Optimization', body: 'Content structure and formatting recommendations to improve visibility in ChatGPT, Perplexity, and Google AI Overviews.' },
  { title: 'Conversion Optimization', body: 'CTA placement, trust signals, form friction — a focused review of where visitors are dropping off and exactly why.' },
  { title: 'Consultation & Action Plan', body: 'A one-on-one call to walk through findings, answer questions, and agree on a realistic path forward for your site.' },
];

const FAQ_ITEMS = [
  {
    q: 'Why did you reach out to my business?',
    a: 'We proactively review websites for businesses in your area and industry. When we identify meaningful improvement opportunities in design, SEO, or AI-search readiness — we reach out. If you received outreach from TMG, it means we completed a real review of your site before contacting you.',
  },
  {
    q: 'What happens in the consultation?',
    a: 'We walk through the specific findings from your website review. You see exactly what we found, why it matters, and what we recommend. There is no sales pressure — the goal is to give you a clear picture of where your site stands and what improvement would realistically do for your business.',
  },
  {
    q: 'What is GEO / AI-search optimization?',
    a: 'GEO (Generative Engine Optimization) is about making your content visible and quotable in AI tools like ChatGPT, Perplexity, and Google AI Overviews. Increasingly, buyers use these tools instead of traditional Google. If your site is not structured for AI readability, you are invisible to that audience.',
  },
  {
    q: 'Is the review customized for my site?',
    a: 'Yes. We evaluate your specific website across six dimensions: messaging and content, UX and conversion, SEO health, visual design, GEO/AI-search readiness, and critical technical issues. Every finding is based on your site — not a generic template.',
  },
  {
    q: 'Do you work with local and service-based businesses?',
    a: 'Yes. Most of our clients are local and regional service businesses — contractors, healthcare providers, professional services, retail, and specialty industries. We understand what works for businesses that serve a specific geography or community.',
  },
  {
    q: 'What does a redesign or optimization engagement look like?',
    a: 'It starts with a consultation. If there is a fit, we scope an engagement based on what your site actually needs. Some clients need a full redesign, others need targeted SEO or GEO work. We scope specifically for your situation — not a one-size package.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', background: T.white, color: T.txtPri }}>
      <AttributionTracker />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{ background: T.navy, borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tmg-logo.png" alt="TMG" style={{ height: '28px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a href="#how-it-works" style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, textDecoration: 'none', padding: '6px 12px' }}>How it works</a>
            <a href="#services" style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, textDecoration: 'none', padding: '6px 12px' }}>Services</a>
            <a href="#faq" style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, textDecoration: 'none', padding: '6px 12px' }}>FAQ</a>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: T.blue, color: T.white, padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', marginLeft: '8px' }}
            >
              Book a Consultation
            </a>
            <Link
              href="/sign-in"
              style={{ color: '#64748b', fontSize: '12px', textDecoration: 'none', padding: '6px 12px', border: '1px solid #334155', borderRadius: '6px', marginLeft: '4px' }}
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{ background: T.navy, padding: '96px 40px 80px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#0a1829', border: '1px solid #1e3a5f', borderRadius: '20px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: T.blueSft, letterSpacing: '0.05em', marginBottom: '28px' }}>
            Website Redesign · SEO · GEO / AI Search · Conversion
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 900, color: T.white, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
            Your website should be<br />
            <span style={{ color: T.blueSft }}>winning you business.</span>
          </h1>
          <p style={{ fontSize: '19px', color: '#94a3b8', lineHeight: 1.65, margin: '0 auto 40px', maxWidth: '600px' }}>
            We identify what is holding your site back — weak messaging, missed SEO, AI-search gaps, and design that does not convert — and help you fix it.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: T.blue, color: T.white, padding: '14px 32px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, textDecoration: 'none' }}
            >
              Book a Free Consultation
            </a>
            <a
              href="#how-it-works"
              style={{ background: 'transparent', color: '#94a3b8', padding: '14px 32px', borderRadius: '8px', fontSize: '16px', fontWeight: 600, textDecoration: 'none', border: '1px solid #334155' }}
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* ── Trust bar ───────────────────────────────────────────────────────── */}
      <div style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '20px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '40px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            'Houston-based agency',
            'AI-powered site review',
            'Every review is site-specific',
            'SEO + GEO + Conversion, not just design',
          ].map(item => (
            <div key={item} style={{ fontSize: '13px', color: T.txtSec, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: T.blue, fontWeight: 800 }}>✓</span> {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── Why you heard from us ────────────────────────────────────────────── */}
      <section style={{ background: T.white, padding: '80px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <div>
            <Eyebrow text="Why we may have contacted you" />
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: T.txtPri, lineHeight: 1.2, margin: '0 0 16px' }}>
              We review sites before we reach out — not after.
            </h2>
            <p style={{ fontSize: '17px', color: T.txtSec, lineHeight: 1.7, margin: '0 0 32px' }}>
              If you received outreach from TMG, it is because we analyzed your website and identified specific improvement opportunities. We do not send mass campaigns to random lists. Our team uses a structured review process to evaluate your site before making contact.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                'We crawled and evaluated your site using real metrics',
                'We identified specific gaps that are costing you leads',
                'We reached out because we believe we can genuinely help',
              ].map(item => (
                <div key={item} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '20px', height: '20px', background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <span style={{ color: T.blue, fontSize: '10px', fontWeight: 900 }}>✓</span>
                  </div>
                  <span style={{ fontSize: '15px', color: T.txtSec, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: T.blue, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '20px' }}>
              Example site score breakdown
            </div>
            {[
              { label: 'Content & Messaging', score: 51 },
              { label: 'UX / Conversion', score: 44 },
              { label: 'SEO Health', score: 38 },
              { label: 'GEO / AI Search', score: 29 },
              { label: 'Visual Design', score: 57 },
            ].map(cat => {
              const c = cat.score >= 70 ? '#16a34a' : cat.score >= 45 ? '#d97706' : '#dc2626';
              return (
                <div key={cat.label} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: T.txtPri }}>{cat.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: c }}>{cat.score}/100</span>
                  </div>
                  <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '4px', width: `${cat.score}%`, background: c }} />
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: '18px', padding: '12px 16px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', fontSize: '13px', color: '#92400e', fontWeight: 500 }}>
              Overall: <strong>44/100</strong> — significant improvement opportunity across SEO, GEO, and conversion.
            </div>
          </div>
        </div>
      </section>

      {/* ── What we help fix ────────────────────────────────────────────────── */}
      <section style={{ background: T.offWhite, borderTop: '1px solid #e2e8f0', padding: '80px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <Eyebrow text="Common problems we identify" />
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: T.txtPri, margin: '0 0 16px' }}>Most business websites have the same six issues.</h2>
            <p style={{ fontSize: '17px', color: T.txtSec, lineHeight: 1.7, maxWidth: '540px', margin: '0 auto' }}>
              Any one of these costs you leads. Most sites have several. We identify which ones apply specifically to yours.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {PROBLEMS.map(p => (
              <div key={p.title} style={{ background: T.white, border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px 28px' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{p.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: T.txtPri, marginBottom: '8px' }}>{p.title}</div>
                <p style={{ fontSize: '14px', color: T.txtSec, lineHeight: 1.65, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get ────────────────────────────────────────────────────── */}
      <section id="services" style={{ background: T.white, padding: '80px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '64px', alignItems: 'start' }}>
          <div>
            <Eyebrow text="What we deliver" />
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: T.txtPri, lineHeight: 1.2, margin: '0 0 16px' }}>
              A complete picture — and a clear path forward.
            </h2>
            <p style={{ fontSize: '17px', color: T.txtSec, lineHeight: 1.7, margin: '0 0 32px' }}>
              Our work starts with a thorough review and ends with a concrete action plan. You understand exactly what needs to change, in what order, and what each change will do for your business.
            </p>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', background: T.blue, color: T.white, padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}
            >
              Book a Consultation →
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {SERVICES.map((s, i) => (
              <div key={s.title} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '18px 20px', background: T.offWhite, borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '32px', height: '32px', background: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: '12px', color: T.blue }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: T.txtPri, marginBottom: '4px' }}>{s.title}</div>
                  <div style={{ fontSize: '13px', color: T.txtSec, lineHeight: 1.6 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: T.navy, padding: '80px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <Eyebrow text="The process" light />
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: T.white, marginBottom: '16px' }}>Simple. Transparent. No pressure.</h2>
          <p style={{ fontSize: '17px', color: '#94a3b8', lineHeight: 1.65, maxWidth: '540px', margin: '0 auto 56px' }}>
            We do the homework first. The consultation is a conversation — not a sales call.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', textAlign: 'left' }}>
            {[
              { n: '01', title: 'We review your site', body: 'Our system crawls your website and runs it through a structured evaluation across design, SEO, messaging, and AI-search readiness.' },
              { n: '02', title: 'We score and prioritize', body: 'Findings are weighted by business impact. Critical issues, high-leverage improvements, and refinements — ranked in order.' },
              { n: '03', title: 'We share the report', body: 'You get a branded PDF report with real findings specific to your site. No strings attached, no generic template.' },
              { n: '04', title: 'We meet and advise', body: 'In the consultation, we walk through everything. You leave with clarity on what to fix and what a project looks like.' },
            ].map(step => (
              <div key={step.n} style={{ background: '#1e293b', borderRadius: '12px', padding: '28px 24px', border: '1px solid #1e3a5f' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e3a5f', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                  {step.n}
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: T.white, marginBottom: '10px' }}>{step.title}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.65 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GEO / AI Search explainer ───────────────────────────────────────── */}
      <section style={{ background: T.offWhite, borderTop: '1px solid #e2e8f0', padding: '80px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <div>
            <Eyebrow text="GEO / AI-Search Optimization" />
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: T.txtPri, lineHeight: 1.2, margin: '0 0 16px' }}>
              The next generation of search is already here.
            </h2>
            <p style={{ fontSize: '17px', color: T.txtSec, lineHeight: 1.7, margin: '0 0 28px' }}>
              More buyers are starting their vendor searches with ChatGPT, Perplexity, and Google AI Overviews instead of traditional search. If your content is not structured for AI readability, you do not appear in those results — even if you rank well in traditional SEO.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'ChatGPT and Perplexity are replacing Google for many research queries',
                'AI tools cite and quote sources — your content needs to be quotable',
                'Structured content, clear authority signals, and entity presence matter',
                'We evaluate and improve your AI-search readiness in every review',
              ].map(point => (
                <div key={point} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: T.blue, fontWeight: 800, marginTop: '1px', flexShrink: 0 }}>→</span>
                  <span style={{ fontSize: '14px', color: T.txtSec, lineHeight: 1.5 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: T.white, border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: T.blue, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '20px' }}>
              Where buyers find vendors today
            </div>
            {[
              { platform: 'Traditional Google search', pct: 62, note: 'still dominant but declining' },
              { platform: 'ChatGPT / AI search', pct: 24, note: 'fastest growing channel' },
              { platform: 'Perplexity & AI Overviews', pct: 9, note: 'skews toward B2B research' },
              { platform: 'Other / direct / referral', pct: 5, note: '' },
            ].map(row => (
              <div key={row.platform} style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: T.txtPri }}>{row.platform}</span>
                    {row.note && <span style={{ fontSize: '11px', color: T.txtMid, marginLeft: '8px' }}>{row.note}</span>}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: T.txtSec }}>{row.pct}%</span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '4px', width: `${row.pct}%`, background: row.pct >= 20 ? T.blue : '#94a3b8' }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>Industry composite estimate, 2025–2026</div>
          </div>
        </div>
      </section>

      {/* ── Main CTA ────────────────────────────────────────────────────────── */}
      <section style={{ background: T.blue, padding: '80px 40px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 900, color: T.white, marginBottom: '16px', lineHeight: 1.2 }}>
            Ready to see what your site is leaving on the table?
          </h2>
          <p style={{ fontSize: '17px', color: '#bfdbfe', lineHeight: 1.65, marginBottom: '36px' }}>
            Book a free consultation. We walk through your site review together — no pressure, no commitments, just clarity on where you stand.
          </p>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', background: T.white, color: T.blue, padding: '16px 40px', borderRadius: '8px', fontSize: '17px', fontWeight: 800, textDecoration: 'none' }}
          >
            Book Your Free Consultation →
          </a>
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#93c5fd' }}>
            No commitment required. Typically 30–45 minutes.
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ background: T.white, padding: '80px 40px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <Eyebrow text="Common questions" />
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: T.txtPri, margin: 0 }}>Frequently asked questions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={item.q} style={{ borderTop: '1px solid #e2e8f0', padding: '24px 0', paddingBottom: i === FAQ_ITEMS.length - 1 ? 0 : '24px' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', color: T.txtPri, marginBottom: '10px' }}>{item.q}</div>
                <p style={{ fontSize: '15px', color: T.txtSec, lineHeight: 1.7, margin: 0 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portal access ───────────────────────────────────────────────────── */}
      <section style={{ background: T.offWhite, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 40px', display: 'flex', gap: '40px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: T.txtPri, marginBottom: '6px' }}>Team &amp; Operator Access</div>
            <p style={{ fontSize: '14px', color: T.txtSec, margin: 0, lineHeight: 1.6 }}>
              Already working with TMG? Log in to access the portal — manage prospects, reports, outreach campaigns, and jobs.
            </p>
          </div>
          <Link
            href="/sign-in"
            style={{ display: 'inline-block', background: T.navy, color: T.white, padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Log in to Portal →
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: T.navy, padding: '48px 40px 32px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '32px', paddingBottom: '32px' }}>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tmg-logo.png" alt="TMG" style={{ height: '28px', width: 'auto', marginBottom: '12px', filter: 'brightness(0) invert(1)' }} />
            <p style={{ fontSize: '13px', color: '#475569', margin: 0, maxWidth: '280px', lineHeight: 1.6 }}>
              Houston-based agency specializing in website redesign, SEO, and AI-search optimization for service businesses.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '14px' }}>Services</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['Website Redesign', 'SEO Optimization', 'GEO / AI Search', 'Conversion Optimization'].map(s => (
                  <a key={s} href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>{s}</a>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '14px' }}>Company</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href="#how-it-works" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>How It Works</a>
                <a href="#faq" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>FAQ</a>
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>Book a Consultation</a>
                <Link href="/sign-in" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>Operator Login</Link>
              </div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingTop: '24px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#334155' }}>© 2026 TMG / TexMG. All rights reserved.</div>
          <div style={{ fontSize: '12px', color: '#334155' }}>Houston, Texas</div>
        </div>
      </footer>
    </div>
  );
}
