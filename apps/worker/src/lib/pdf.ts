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
  const { companyName, domain, overallScore, date, brand, executiveSummary, categoryScores, dimensionDetails, recommendations } = data;
  const col = scoreColor(overallScore);

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
      <div class="section-body">${s.markdown.replace(/\n/g, '<br>')}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: #1e293b; background: white; }

  /* COVER */
  .cover { background: #0f172a; color: white; padding: 60px 50px; min-height: 200px; position: relative; }
  .cover-tag { color: ${brand.accentColor}; font-size: 11px; font-weight: 700; letter-spacing: 2px; margin-bottom: 12px; }
  .cover-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .cover-sub { font-size: 14px; color: #94a3b8; margin-bottom: 6px; }
  .cover-meta { font-size: 10px; color: #64748b; }
  .score-badge { position: absolute; top: 40px; right: 50px; width: 96px; height: 96px; border-radius: 50%; background: #1e293b; border: 3px solid ${col}; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .score-num { font-size: 32px; font-weight: 700; color: ${col}; }
  .score-denom { font-size: 10px; color: #94a3b8; }

  /* CONTENT */
  .content { padding: 40px 50px; }
  h2 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 30px 0 12px; border-bottom: 2px solid ${brand.accentColor}; padding-bottom: 6px; }

  /* EXEC SUMMARY */
  .exec-summary { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
  .exec-summary p { font-size: 11px; color: #475569; line-height: 1.6; }
  .exec-cols { display: flex; gap: 20px; margin-top: 16px; }
  .exec-col { flex: 1; }
  .exec-col-title { font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1px; margin-bottom: 8px; }
  .exec-col ul { list-style: none; font-size: 11px; color: #334155; }
  .exec-col li { padding: 3px 0; }
  .exec-col li:before { content: "→ "; color: ${brand.accentColor}; font-weight: 700; }

  /* BARS */
  .bar-row { display: flex; align-items: center; margin-bottom: 10px; gap: 12px; }
  .bar-label { width: 160px; font-size: 10px; color: #475569; flex-shrink: 0; }
  .bar-track { flex: 1; height: 18px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
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

  /* FOOTER / CTA */
  .cta-footer { background: #1e293b; color: white; padding: 28px 50px; margin-top: 40px; }
  .cta-footer h3 { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
  .cta-footer p { font-size: 10px; color: #94a3b8; line-height: 1.6; }
  .cta-email { color: ${brand.accentColor}; font-size: 10px; margin-top: 8px; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-tag">COMPLIMENTARY ANALYSIS</div>
  <div class="cover-title">Website Marketing Audit</div>
  <div class="cover-sub">${companyName}</div>
  <div class="cover-meta">Prepared ${date} by ${brand.senderName} · ${brand.companyName}</div>
  <div class="score-badge">
    <div class="score-num">${overallScore}</div>
    <div class="score-denom">/ 100</div>
  </div>
</div>

<div class="content">

  <!-- EXEC SUMMARY -->
  <h2>Executive Summary</h2>
  <div class="exec-summary">
    <p>${executiveSummary.topOpportunity}</p>
    <div class="exec-cols">
      <div class="exec-col">
        <div class="exec-col-title">STRENGTHS</div>
        <ul>${executiveSummary.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
      </div>
      <div class="exec-col">
        <div class="exec-col-title">CRITICAL GAPS</div>
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
  <h3>Want to fix these gaps? Let's talk.</h3>
  <p>${brand.senderName} from ${brand.companyName} helps Houston businesses solve exactly these issues with managed IT and AI automation. Reply to schedule a free 15-minute strategy call.</p>
  ${brand.senderEmail ? `<div class="cta-email">${brand.senderEmail}</div>` : ''}
  ${brand.bookingUrl ? `<div class="cta-email">${brand.bookingUrl}</div>` : ''}
</div>

</body>
</html>`;
}
