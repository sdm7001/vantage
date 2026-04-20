import { prisma } from '@vantage/database';
import { Queue } from 'bullmq';
import { type OutreachInitialJobData, QUEUE_NAMES, JOB_OPTIONS } from '@vantage/queue';
import { runOutreachCopyAgent } from '../agents/outreach-copy.agent';
import { runQaGuardrails } from '../agents/qa-guardrails.agent';
import { sendEmail } from '../lib/mailer';
import { getEnv } from '@vantage/config';
import { getRedis } from '../lib/redis';
import { resolveBrandSender, buildEmailHtml } from '../lib/outreach-email';

export async function outreachInitialProcessor(data: OutreachInitialJobData): Promise<void> {
  const { orgId, prospectId, contactId, threadId, emailId } = data;
  const env = getEnv();

  // Daily cap check (atomic)
  const today = new Date().toISOString().slice(0, 10);
  const existing = await prisma.dailyEmailLimit.findUnique({ where: { orgId_date: { orgId, date: today } } });
  const campaign = await prisma.outreachThread.findUniqueOrThrow({ where: { id: threadId }, include: { campaign: true } });
  const limit = campaign.campaign?.dailyNewLimit ?? 10;

  if (existing && existing.newOutboundSent >= limit) {
    // Re-enqueue for 00:05 tomorrow so the email sends when the cap resets
    const midnight = new Date();
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 5, 0, 0);
    const queue = new Queue(QUEUE_NAMES.OUTREACH_INITIAL, { connection: getRedis() });
    await queue.add('send-initial', data, { ...JOB_OPTIONS[QUEUE_NAMES.OUTREACH_INITIAL], delay: midnight.getTime() - Date.now() });
    console.log(`[outreach-initial] Cap reached (${limit}) — re-queued for ${midnight.toISOString()}`);
    return;
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

  const [prospect, report, painPointAnalysis, org] = await Promise.all([
    prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } }),
    prisma.prospectReport.findFirst({
      where: { prospectId, status: 'ready' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.painPointAnalysis.findFirst({
      where: { prospectId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: orgId }, include: { brandConfig: true } }),
  ]);

  const { senderName, senderEmail, senderCompany, bookingUrl, appUrl } = resolveBrandSender(org.brandConfig, env);

  const reportUrl = report ? `${appUrl}/r/${report.publicToken}` : '';
  const overallScore = (report?.jsonContent as { overallScore?: number } | null)?.overallScore ?? 0;

  const emailDraft = await runOutreachCopyAgent({
    prospectDomain: prospect.domain,
    companyName: prospect.companyName ?? prospect.domain,
    contactFirstName: contact.firstName ?? undefined,
    contactLastName: contact.lastName ?? undefined,
    contactTitle: contact.title ?? undefined,
    overallScore,
    topPainPoint: painPointAnalysis?.primaryPainPoint ?? 'your website has optimization opportunities',
    outreachAngle: (painPointAnalysis?.outreachAngles as Array<{ angle: string }> | null)?.[0]?.angle ?? 'audit results',
    reportPublicUrl: reportUrl,
    senderName,
    senderCompany,
    senderEmail,
    bookingUrl: bookingUrl ?? undefined,
  });

  const allFindings: string[] = (painPointAnalysis?.valueHooks as string[] | null) ?? [];
  const qa = await runQaGuardrails(emailDraft.htmlBody, allFindings, 'email');
  if (!qa.passed && qa.violations.length > 0) {
    console.warn('Email QA violations:', qa.violations);
  }

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

  await prisma.$transaction([
    prisma.email.update({
      where: { id: emailId },
      data: { resendMessageId: msgId, status: 'sent', sentAt: now, subject: emailDraft.subject, htmlBody: finalHtml, fromName: senderName, fromEmail: senderEmail },
    }),
    prisma.outreachThread.update({
      where: { id: threadId },
      data: {
        state: 'INITIAL_SENT',
        nextActionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.prospect.update({
      where: { id: prospectId },
      data: { status: 'OUTREACH_SENT' },
    }),
    prisma.dailyEmailLimit.upsert({
      where: { orgId_date: { orgId, date: today } },
      update: { newOutboundSent: { increment: 1 } },
      create: { orgId, date: today, newOutboundSent: 1 },
    }),
  ]);

  console.log(`Initial outreach sent to ${contact.email} (conv: ${msgId})`);
}
