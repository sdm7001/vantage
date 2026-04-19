import { prisma } from '@vantage/database';
import type { OutreachFollowupJobData } from '@vantage/queue';
import { runFollowupCopyAgent } from '../agents/followup-copy.agent';
import { sendEmail } from '../lib/mailer';
import { getEnv } from '@vantage/config';

const FOLLOWUP_STATE_MAP: Record<number, string> = {
  1: 'FOLLOWUP_1_SENT',
  2: 'FOLLOWUP_2_SENT',
  3: 'FOLLOWUP_3_SENT',
  4: 'FOLLOWUP_4_SENT',
};

const NEXT_ACTION_DAYS: Record<number, number> = {
  1: 7,   // After followup 1, wait until day 7
  2: 14,  // After followup 2, wait until day 14
  3: 21,  // After followup 3, wait until day 21
  4: 0,   // No further followups
};

export async function outreachFollowupProcessor(data: OutreachFollowupJobData): Promise<void> {
  const { orgId, prospectId, contactId, threadId, emailId, sequenceIndex } = data;
  const env = getEnv();

  const [thread, contact, painPointAnalysis, brand, report, previousEmail] = await Promise.all([
    prisma.outreachThread.findUniqueOrThrow({ where: { id: threadId } }),
    prisma.contact.findUniqueOrThrow({ where: { id: contactId } }),
    prisma.painPointAnalysis.findFirst({ where: { prospectId }, orderBy: { createdAt: 'desc' } }),
    prisma.organization.findUniqueOrThrow({ where: { id: orgId }, include: { brandConfig: true } }).then((o: { brandConfig: unknown }) => o.brandConfig as Awaited<ReturnType<typeof prisma.brandConfig.findUnique>> | null),
    prisma.prospectReport.findFirst({ where: { prospectId, status: 'ready' }, orderBy: { createdAt: 'desc' } }),
    prisma.email.findFirst({
      where: { threadId, sequenceIndex: sequenceIndex - 1 },
      include: { events: { where: { type: { in: ['opened', 'clicked'] } } } },
    }),
  ]);

  // Stop conditions
  if (['REPLIED', 'OPTED_OUT', 'BOUNCED', 'SUPPRESSED', 'COMPLETED'].includes(thread.state)) {
    console.log(`Thread ${threadId} in terminal state ${thread.state} — skipping followup`);
    return;
  }

  if (!contact.email) throw new Error(`Contact ${contactId} has no email`);

  const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
  const senderName = brand?.senderName ?? env.TEXMG_SENDER_NAME;
  const senderEmail = brand?.senderEmail ?? env.TEXMG_SENDER_EMAIL;
  const senderCompany = brand?.companyName ?? env.TEXMG_COMPANY_NAME;
  const bookingUrl = brand?.bookingUrl ?? env.TEXMG_BOOKING_URL;
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const reportUrl = report ? `${appUrl}/reports/${report.publicToken}` : '';

  const emailDraft = await runFollowupCopyAgent({
    prospectDomain: prospect.domain,
    companyName: prospect.companyName ?? prospect.domain,
    contactFirstName: contact.firstName ?? undefined,
    contactTitle: contact.title ?? undefined,
    overallScore: 0,
    topPainPoint: (painPointAnalysis?.primaryPainPoint as string) ?? 'your website optimization',
    outreachAngle: (painPointAnalysis?.outreachAngles as Array<{ angle: string }> | null)?.[sequenceIndex]?.angle ?? '',
    reportPublicUrl: reportUrl,
    senderName,
    senderCompany,
    senderEmail,
    bookingUrl: bookingUrl ?? undefined,
    sequenceIndex: sequenceIndex as 1 | 2 | 3 | 4,
    previousEmailSubject: previousEmail?.subject ?? '',
    previousEmailSentAt: previousEmail?.sentAt?.toISOString() ?? '',
    threadEngagement: {
      opened: !!previousEmail?.events?.some((e: { type: string }) => e.type === 'opened'),
      clicked: !!previousEmail?.events?.some((e: { type: string }) => e.type === 'clicked'),
    },
  });

  // Tracking pixel + unsubscribe footer
  const unsubToken = Buffer.from(`${contactId}:${contact.email}`).toString('base64url');
  const footer = `<br/><br/><p style="font-size:11px;color:#999">To unsubscribe, <a href="${appUrl}/unsubscribe/${unsubToken}">click here</a>.</p>`;
  const trackingPixel = `<img src="${appUrl}/api/track/${emailId}.gif" width="1" height="1" style="display:none" alt="" />`;
  const finalHtml = emailDraft.htmlBody + trackingPixel + footer;

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
      data: { resendMessageId: msgId, status: 'sent', sentAt: now, subject: emailDraft.subject, htmlBody: finalHtml },
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
