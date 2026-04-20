import { prisma } from '@vantage/database';
import type { OutreachFollowupJobData } from '@vantage/queue';
import { runFollowupCopyAgent } from '../agents/followup-copy.agent';
import { sendEmail } from '../lib/mailer';
import { getEnv } from '@vantage/config';
import { resolveBrandSender, buildEmailHtml } from '../lib/outreach-email';

const FOLLOWUP_STATE_MAP: Record<number, string> = {
  1: 'FOLLOWUP_1_SENT',
  2: 'FOLLOWUP_2_SENT',
  3: 'FOLLOWUP_3_SENT',
  4: 'FOLLOWUP_4_SENT',
  5: 'FOLLOWUP_5_SENT',
};

const NEXT_ACTION_DAYS: Record<number, number> = {
  1: 7,
  2: 14,
  3: 21,
  4: 30,  // win-back at Day +30
  5: 0,   // no further followups
};

export async function outreachFollowupProcessor(data: OutreachFollowupJobData): Promise<void> {
  const { orgId, prospectId, contactId, threadId, emailId, sequenceIndex } = data;
  const env = getEnv();

  const [thread, contact, painPointAnalysis, org, report, previousEmail] = await Promise.all([
    prisma.outreachThread.findUniqueOrThrow({ where: { id: threadId } }),
    prisma.contact.findUniqueOrThrow({ where: { id: contactId } }),
    prisma.painPointAnalysis.findFirst({ where: { prospectId }, orderBy: { createdAt: 'desc' } }),
    prisma.organization.findUniqueOrThrow({ where: { id: orgId }, include: { brandConfig: true } }),
    prisma.prospectReport.findFirst({ where: { prospectId, status: 'ready' }, orderBy: { createdAt: 'desc' } }),
    prisma.email.findFirst({
      where: { threadId, sequenceIndex: sequenceIndex - 1 },
      include: { events: { where: { type: { in: ['opened', 'clicked'] } } } },
    }),
  ]);

  if (['REPLIED', 'OPTED_OUT', 'BOUNCED', 'SUPPRESSED', 'COMPLETED'].includes(thread.state)) {
    console.log(`Thread ${threadId} in terminal state ${thread.state} — skipping followup`);
    return;
  }

  if (!contact.email) throw new Error(`Contact ${contactId} has no email`);

  const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
  const { senderName, senderEmail, senderCompany, bookingUrl, appUrl } = resolveBrandSender(org.brandConfig, env);
  const reportUrl = report ? `${appUrl}/reports/${report.publicToken}` : '';
  const overallScore = (report?.jsonContent as { overallScore?: number } | null)?.overallScore ?? 0;

  const emailDraft = await runFollowupCopyAgent({
    prospectDomain: prospect.domain,
    companyName: prospect.companyName ?? prospect.domain,
    contactFirstName: contact.firstName ?? undefined,
    contactTitle: contact.title ?? undefined,
    overallScore,
    topPainPoint: (painPointAnalysis?.primaryPainPoint as string) ?? 'your website optimization',
    outreachAngle: (painPointAnalysis?.outreachAngles as Array<{ angle: string }> | null)?.[sequenceIndex]?.angle ?? '',
    reportPublicUrl: reportUrl,
    senderName,
    senderCompany,
    senderEmail,
    bookingUrl: bookingUrl ?? undefined,
    sequenceIndex: sequenceIndex as 1 | 2 | 3 | 4 | 5,
    previousEmailSubject: previousEmail?.subject ?? '',
    previousEmailSentAt: previousEmail?.sentAt?.toISOString() ?? '',
    threadEngagement: {
      opened: !!previousEmail?.events?.some((e: { type: string }) => e.type === 'opened'),
      clicked: !!previousEmail?.events?.some((e: { type: string }) => e.type === 'clicked'),
    },
  });

  const finalHtml = buildEmailHtml(emailDraft.htmlBody, emailId, contactId, contact.email, appUrl);

  const { conversationId: msgId } = await sendEmail({
    fromName: senderName,
    fromEmail: senderEmail,
    to: contact.email,
    subject: emailDraft.subject,
    html: finalHtml,
    text: emailDraft.textBody,
  });

  const now = new Date();
  const nextState = FOLLOWUP_STATE_MAP[sequenceIndex] ?? 'COMPLETED';
  const nextDays = NEXT_ACTION_DAYS[sequenceIndex] ?? 0;
  const nextActionAt = nextDays > 0 ? new Date(Date.now() + nextDays * 24 * 60 * 60 * 1000) : null;

  await prisma.$transaction([
    prisma.email.update({
      where: { id: emailId },
      data: { resendMessageId: msgId, status: 'sent', sentAt: now, subject: emailDraft.subject, htmlBody: finalHtml, fromName: senderName, fromEmail: senderEmail },
    }),
    prisma.outreachThread.update({
      where: { id: threadId },
      data: {
        state: nextState as never,
        currentStep: sequenceIndex,
        nextActionAt,
      },
    }),
  ]);

  console.log(`Follow-up #${sequenceIndex} sent to ${contact.email}`);
}
