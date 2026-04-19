import { prisma } from '@vantage/database';
import { notFound } from 'next/navigation';

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const report = await prisma.prospectReport.findFirst({
    where: { publicToken: token, status: 'ready' },
    include: { prospect: { select: { companyName: true, domain: true } } },
  });

  if (!report) notFound();

  const reportData = report.jsonContent as Record<string, unknown> | null;
  const overallScore = (reportData?.overallScore as number) ?? 0;
  const company = report.prospect.companyName ?? report.prospect.domain;

  const scoreColor = overallScore >= 70 ? '#16a34a' : overallScore >= 45 ? '#d97706' : '#dc2626';
  const scoreLabel = overallScore >= 70 ? 'Strong' : overallScore >= 45 ? 'Needs Work' : 'Critical Gap';

  const pdfUrl = `/api/reports/${token}`;
  const downloadUrl = `/api/reports/${token}?download=1`;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', color: 'white', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#3b82f6', letterSpacing: '2px', fontWeight: 700 }}>COMPLIMENTARY ANALYSIS BY TEXMG</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>Website Marketing Audit</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>{company}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'center', background: '#1e293b', border: `3px solid ${scoreColor}`, borderRadius: '50%', width: '80px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: scoreColor }}>{overallScore}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>/ 100</div>
          </div>
          <a
            href={downloadUrl}
            style={{ background: '#3b82f6', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}
          >
            ↓ Download PDF
          </a>
        </div>
      </div>

      {/* Score badge */}
      <div style={{ background: scoreColor, color: 'white', padding: '10px 40px', fontSize: '13px', fontWeight: 600 }}>
        Overall Assessment: {scoreLabel} ({overallScore}/100)
      </div>

      {/* PDF Embed */}
      <div style={{ padding: '32px 40px' }}>
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '24px' }}>
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: '900px', border: 'none' }}
            title={`Website audit report for ${company}`}
          />
        </div>

        {/* Category scores summary */}
        {Array.isArray(reportData?.categoryScores) && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Score Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {(reportData.categoryScores as Array<{ label: string; score: number; weight: number }>).map(cat => {
                const c = cat.score >= 70 ? '#16a34a' : cat.score >= 45 ? '#d97706' : '#dc2626';
                return (
                  <div key={cat.label} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', borderLeft: `4px solid ${c}` }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{cat.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: c }}>{cat.score}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{Math.round(cat.weight * 100)}% weight</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: '#1e293b', color: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Want to fix these gaps?</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
            TexMG helps Houston businesses solve these exact issues with managed IT and AI-powered marketing.
          </p>
          <a
            href="mailto:scott@texmg.com?subject=Website Audit Follow-Up"
            style={{ background: '#3b82f6', color: 'white', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}
          >
            Reply to Schedule a Free Call
          </a>
        </div>
      </div>
    </div>
  );
}
