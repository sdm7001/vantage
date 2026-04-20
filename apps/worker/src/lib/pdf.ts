import puppeteer from 'puppeteer';
import type { ReportData } from '@vantage/shared';

export async function generateReportPDF(data: ReportData): Promise<Buffer> {
  const html = buildReportHtml(data);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function renderSectionBody(text: string): string {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return paragraphs.map(p => `<p>${p.replace(/\n/g, ' ')}</p>`).join('');
}

function scoreColor(score: number): string {
  if (score >= 70) return '#16a34a';
  if (score >= 45) return '#d97706';
  return '#dc2626';
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Strong';
  if (score >= 45) return 'Needs Work';
  return 'Critical Gap';
}

function buildReportHtml(data: ReportData): string {
  const {
    companyName, domain, overallScore, date, brand,
    executiveSummary, categoryScores, dimensionDetails, recommendations,
  } = data;

  const col = scoreColor(overallScore);
  const primary = brand.primaryColor || '#1a1a2e';
  const accent = brand.accentColor || '#1565C0';

  const logoHtml = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${brand.companyName}" style="height:38px;max-width:140px;object-fit:contain;filter:brightness(0) invert(1);"/>`
    : `<div style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.02em;">${brand.companyName}</div>`;

  const categoryRows = categoryScores.map(c => `
    <div class="bar-row">
      <span class="bar-label">${c.label}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${c.score}%;background:${scoreColor(c.score)}"></div>
      </div>
      <span class="bar-score" style="color:${scoreColor(c.score)}">${c.score} — ${scoreLabel(c.score)}</span>
    </div>`).join('');

  const dimRows = dimensionDetails.map(d => `
    <div class="dim-item" style="border-left:3px solid ${scoreColor(d.score * 10)}">
      <div class="dim-header" style="color:${scoreColor(d.score * 10)}">${d.label} (${d.score}/10)</div>
      ${d.criticalFixes.length ? `<div class="dim-fixes">⚠ ${d.criticalFixes[0]}</div>` : ''}
      ${d.wins.length ? `<div class="dim-wins">✓ ${d.wins[0]}</div>` : ''}
    </div>`).join('');

  const recRows = recommendations.slice(0, 9).map(r => `
    <div class="rec-item priority-${r.priority.toLowerCase()}">
      <span class="rec-badge">${r.priority}</span>
      <div class="rec-content">
        <div class="rec-title">${r.title}</div>
        <div class="rec-desc">${r.description}</div>
      </div>
      <div class="rec-meta">Effort: ${r.effort} · Impact: ${r.impact}</div>
    </div>`).join('');

  const sectionHtml = data.sections.map(s => `
    <div class="section">
      <h2>${s.title}</h2>
      <div class="section-body">${renderSectionBody(s.markdown)}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1e293b; background: white; }

  /* ── COVER ──────────────────────────────────────────────────────────── */
  .cover {
    background: ${primary};
    color: white;
    padding: 0;
    min-height: 220px;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* Top bar with logo */
  .cover-topbar {
    padding: 22px 50px 20px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cover-brand-label {
    font-size: 9px;
    color: rgba(255,255,255,0.45);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 4px;
  }

  /* Main cover content */
  .cover-body {
    padding: 32px 50px 40px;
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .cover-tag {
    color: ${accent};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2.5px;
    margin-bottom: 14px;
    text-transform: uppercase;
  }
  .cover-title { font-size: 30px; font-weight: 800; margin-bottom: 10px; line-height: 1.1; }
  .cover-sub { font-size: 15px; color: rgba(255,255,255,0.7); margin-bottom: 6px; font-weight: 600; }
  .cover-meta { font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 4px; }
  .cover-divider { width: 40px; height: 3px; background: ${accent}; border-radius: 2px; margin: 14px 0; }

  /* Score badge */
  .score-badge {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    border: 3px solid ${col};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: 32px;
    margin-top: 4px;
  }
  .score-num { font-size: 34px; font-weight: 800; color: ${col}; line-height: 1; }
  .score-denom { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; }
  .score-label { font-size: 9px; color: ${col}; font-weight: 700; letter-spacing: 1px; margin-top: 3px; }

  /* Accent stripe at bottom of cover */
  .cover-stripe {
    height: 4px;
    background: linear-gradient(90deg, ${accent} 0%, ${primary} 100%);
  }

  /* ── CONTENT ─────────────────────────────────────────────────────────── */
  .content { padding: 40px 50px; }

  h2 {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    margin: 28px 0 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid ${accent};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* EXEC SUMMARY */
  .exec-summary { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid ${accent}; }
  .exec-summary p { font-size: 11px; color: #475569; line-height: 1.6; }
  .exec-cols { display: flex; gap: 20px; margin-top: 16px; }
  .exec-col { flex: 1; }
  .exec-col-title { font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: 1.5px; margin-bottom: 8px; text-transform: uppercase; }
  .exec-col ul { list-style: none; font-size: 11px; color: #334155; }
  .exec-col li { padding: 3px 0; }
  .exec-col li:before { content: "→ "; color: ${accent}; font-weight: 700; }

  /* BARS */
  .bar-row { display: flex; align-items: center; margin-bottom: 10px; gap: 12px; }
  .bar-label { width: 160px; font-size: 10px; color: #475569; flex-shrink: 0; }
  .bar-track { flex: 1; height: 18px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .bar-score { width: 130px; font-size: 10px; font-weight: 600; flex-shrink: 0; }

  /* DIMENSIONS */
  .dim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .dim-item { padding: 10px 12px; background: #f8fafc; border-radius: 4px; }
  .dim-header { font-size: 10px; font-weight: 700; margin-bottom: 4px; }
  .dim-fixes { font-size: 9px; color: #dc2626; margin-top: 3px; }
  .dim-wins { font-size: 9px; color: #16a34a; margin-top: 3px; }

  /* RECOMMENDATIONS */
  .rec-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; margin-bottom: 8px; border-radius: 6px; }
  .priority-p0 { background: #fef2f2; border-left: 4px solid #dc2626; }
  .priority-p1 { background: #fffbeb; border-left: 4px solid #d97706; }
  .priority-p2 { background: #f0fdf4; border-left: 4px solid #16a34a; }
  .rec-badge { font-size: 9px; font-weight: 800; width: 28px; flex-shrink: 0; padding-top: 2px; }
  .rec-content { flex: 1; }
  .rec-title { font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .rec-desc { font-size: 10px; color: #475569; line-height: 1.4; }
  .rec-meta { font-size: 9px; color: #94a3b8; flex-shrink: 0; text-align: right; min-width: 80px; }

  /* SECTIONS */
  .section { margin-bottom: 24px; }
  .section-body { font-size: 11px; color: #334155; line-height: 1.6; }
  .section-body p { margin: 0 0 8px; }

  /* FOOTER / CTA */
  .cta-footer {
    background: ${primary};
    color: white;
    padding: 28px 50px;
    margin-top: 40px;
  }
  .cta-footer-inner { display: flex; justify-content: space-between; align-items: center; gap: 32px; }
  .cta-footer-left { flex: 1; }
  .cta-footer h3 { font-size: 15px; font-weight: 800; margin-bottom: 8px; }
  .cta-footer p { font-size: 10px; color: rgba(255,255,255,0.55); line-height: 1.6; max-width: 480px; }
  .cta-contact { margin-top: 12px; }
  .cta-email { color: ${accent}; font-size: 11px; font-weight: 600; }
  .cta-divider { width: 1px; background: rgba(255,255,255,0.15); align-self: stretch; flex-shrink: 0; }
  .cta-footer-logo { flex-shrink: 0; opacity: 0.85; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">

  <!-- Logo bar -->
  <div class="cover-topbar">
    <div>
      ${logoHtml}
      <div class="cover-brand-label">COMPLIMENTARY WEBSITE ANALYSIS</div>
    </div>
    <div style="font-size:10px;color:rgba(255,255,255,0.35);">
      Confidential · Prepared for ${companyName}
    </div>
  </div>

  <!-- Main content -->
  <div class="cover-body">
    <div>
      <div class="cover-tag">Website Marketing Audit</div>
      <div class="cover-title">${companyName}</div>
      <div class="cover-divider"></div>
      <div class="cover-sub">${domain}</div>
      <div class="cover-meta">Prepared ${date} · ${brand.senderName}, ${brand.companyName}</div>
    </div>
    <div class="score-badge">
      <div class="score-num">${overallScore}</div>
      <div class="score-denom">/ 100</div>
      <div class="score-label">${scoreLabel(overallScore).toUpperCase()}</div>
    </div>
  </div>

  <div class="cover-stripe"></div>
</div>

<div class="content">

  <!-- EXEC SUMMARY -->
  <h2>Executive Summary</h2>
  <div class="exec-summary">
    <p>${executiveSummary.topOpportunity}</p>
    <div class="exec-cols">
      <div class="exec-col">
        <div class="exec-col-title">Strengths</div>
        <ul>${executiveSummary.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
      </div>
      <div class="exec-col">
        <div class="exec-col-title">Critical Gaps</div>
        <ul>${executiveSummary.criticalGaps.map(g => `<li>${g}</li>`).join('')}</ul>
      </div>
    </div>
  </div>

  <!-- SCORE BREAKDOWN -->
  <h2>Score Breakdown</h2>
  ${categoryRows}

  <!-- DETAILED FINDINGS -->
  <h2>Detailed Findings</h2>
  <div class="dim-grid">
    ${dimRows}
  </div>

  <!-- REPORT SECTIONS -->
  ${sectionHtml}

  <!-- RECOMMENDATIONS -->
  <h2>Priority Recommendations</h2>
  ${recRows}

</div>

<!-- CTA FOOTER -->
<div class="cta-footer">
  <div class="cta-footer-inner">
    <div class="cta-footer-left">
      <h3>Want to fix these gaps? Let&apos;s talk.</h3>
      <p>
        ${brand.senderName} from ${brand.companyName} specializes in website redesign, SEO, and GEO/AI search optimization —
        all built directly from findings like these. The first call is free, 30 minutes, no pressure.
      </p>
      <div class="cta-contact">
        ${brand.senderEmail ? `<div class="cta-email">${brand.senderEmail}</div>` : ''}
        ${brand.bookingUrl ? `<div class="cta-email" style="margin-top:4px;">${brand.bookingUrl}</div>` : ''}
      </div>
    </div>
    <div class="cta-divider"></div>
    <div class="cta-footer-logo">
      ${brand.logoUrl
        ? `<img src="${brand.logoUrl}" alt="${brand.companyName}" style="height:36px;max-width:120px;object-fit:contain;filter:brightness(0) invert(1);opacity:0.8;"/>`
        : `<div style="font-size:18px;font-weight:800;color:rgba(255,255,255,0.7);">${brand.companyName}</div>`
      }
    </div>
  </div>
</div>

</body>
</html>`;
}
