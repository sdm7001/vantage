import { callClaudeJSON, MODELS } from '../lib/claude';

type QAResult = {
  passed: boolean;
  violations: string[];
  warnings: string[];
};

export async function runQaGuardrails(
  content: string,
  auditFindings: string[],
  contentType: 'email' | 'report_section'
): Promise<QAResult> {
  const result = await callClaudeJSON<QAResult>({
    model: MODELS.HAIKU,
    system: `You are a quality assurance agent checking outreach content for compliance and accuracy.
Check that all claims are grounded in actual audit findings, not invented.
Return valid JSON only.`,
    messages: [{
      role: 'user',
      content: `Check this ${contentType} content for issues:

CONTENT:
${content.slice(0, 2000)}

ACTUAL AUDIT FINDINGS:
${auditFindings.slice(0, 10).join('\n')}

Check for:
1. Claims not supported by actual findings
2. Overpromising or false urgency
3. Spam trigger language (FREE, GUARANTEED, URGENT, etc.)
4. Excessive length or fluff
5. Missing personalization (generic templates)
6. Legal risks (guaranteeing results, making false comparisons)

Return JSON:
{
  "passed": true/false,
  "violations": ["critical issues that must be fixed"],
  "warnings": ["minor issues to consider"]
}`,
    }],
    maxTokens: 600,
  });

  return result;
}
