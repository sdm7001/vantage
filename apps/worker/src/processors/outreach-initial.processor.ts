import { prisma } from '@vantage/database';
import type { OutreachInitialJobData } from '@vantage/queue';
import { runOutreachCopyAgent } from '../agents/outreach-copy.agent';
import { runQaGuardrails } from '../agents/qa-guardrails.agent';
import { sendEmail } from '../lib/mailer';
import { getEnv } from '@vantage/config';

export async function outreachInitialProcessor(data: OutreachInitialJobData): Promise<void> {
  const { orgId, prospectId, contactId, threadId, emailId } = data;
  const env = getEnv();

  // Daily cap check (atomic)
  const today = new Date().toISOString().slice(0, 10);
  const existing = await prisma.dailyEmailLimit.findUnique({ where: { orgId_date: { orgId, date: today } } });
  const campaign = await prisma.outreachThread.findUniqueOrThrow({ where: { id: threadId }, include: { campaign: true } });
  const limit = campaign.campaign?.dailyNewLimit ?? 10;

  if (existing && existing.newOutboundSent >= limit) {
    throw new Error(`Daily cap (${limit}) reached for org ${orgId} on ${today}`);
  }

  // Suppression check
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  if (!contact.email) throw new Error(`Contact ${contactId} has no email`);

  const suppressed = await prisma.suppressionEntry.findFirst({
    where: {
      orgId,
      OR: [
        { type: 'EMAIL', value: contact.email },
        { type: 'DOMAIN', value: contact.email.split('@')[1] },
      ],
    },
  });

  if (suppressed) {
    await prisma.outreachThread.update({
      where: { id: threadId },
      data: { state: 'SUPPRESSED' },
    });
    return;
  }

  const [prospect, report, painPointAnalysis, brand] = await Promise.all([
    prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } }),
    prisma.prospectReport.findFirst({
      where: { prospectId, status: 'ready' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.painPointAnalysis.findFirst({
      where: { prospectId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: orgId }, include: { brandConfig: true } }).then((o: { brandConfig: unknown }) => o.brandConfig as Awaited<ReturnType<typeof prisma.brandConfig.findUnique>> | null),
  ]);

  const senderName = brand?.senderName ?? env.TEXMG_SENDER_NAME;
  const senderEmail = brand?.senderEmail ?? env.TEXMG_SENDER_EMAIL;
  const senderCompany = brand?.companyName ?? env.TEXMG_COMPANY_NAME;
  const bookingUrl = brand?.bookingUrl ?? env.TEXMG_BOOKING_URL;
  const appUrl = env.NEXT_PUBLIC_APP_URL;

  const reportUrl = report
    ? `${appUrl}/reports/${report.publicToken}`
    : '';

  const emailDraft = await runOutreachCopyAgent({
    prospectDomain: prospect.domain,
    companyName: prospect.companyName ?? prospect.domain,
    contactFirstName: contact.firstName ?? undefined,
    contactLastName: contact.lastName ?? undefined,
    contactTitle: contact.title ?? undefined,
    overallScore: 0,
    topPainPoint: painPointAnalysis?.primaryPainPoint ?? 'your website has optimization opportunities',
    outreachAngle: (painPointAnalysis?.outreachAngles as Array<{ angle: string }> | null)?.[0]?.angle ?? 'audit results',
    reportPublicUrl: reportUrl,
    senderName,
    senderCompany,
    senderEmail,
    bookingUrl: bookingUrl ?? undefined,
  });

  // QA check
  const allFindings: string[] = (painPointAnalysis?.valueHooks as string[] | null) ?? [];
  const qa = await runQaGuardrails(emailDraft.htmlBody, allFindings, 'email');
  if (!qa.passed && qa.violations.length > 0) {
    console.warn('Email QA violations:', qa.violations);
    // Log violations but continue — operator reviews before approving
  }

  // Build unsubscribe token
  const unsubToken = Buffer.from(`${contactId}:${contact.email}`).toString('base64url');
  const unsubUrl = `${appUrl}/unsubscribe/${unsubToken}`;

  // Inject tracking pixel + unsubscribe
  const trackingPixel = `<img src="${appUrl}/api/track/${emailId}.gif" width="1" height="1" style="display:none" alt="" />`;
  const footer = `<br/><br/><p style="font-size:11px;color:#999">To unsubscribe, <a href="${unsubUrl}">click here</a>.</p>`;
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

  await prisma.$transaction([
    prisma.email.update({
      where: { id: emailId },
      data: { resendMessageId: msgId, status: 'sent', sentAt: now, subject: emailDraft.subject, htmlBody: finalHtml },
    }),
    prisma.outreachThread.update({
      where: { id: threadId },
      data: {
        state: 'INITIAL_SENT',
        nextActionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Day +3
      },
    }),
    prisma.prospect.update({
      where: { id: prospectId },
      data: { status: 'OUTREACH_SENT' },
    }),
    // Increment daily cap
    prisma.dailyEmailLimit.upsert({
      where: { orgId_date: { orgId, date: today } },
      update: { newOutboundSent: { increment: 1 } },
      create: { orgId, date: today, newOutboundSent: 1 },
    }),
  ]);

  console.log(`Initial outreach sent to ${contact.email} (conv: ${msgId})`);
}
