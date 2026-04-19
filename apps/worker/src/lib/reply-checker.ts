import { prisma } from '@vantage/database';
import { getEnv } from '@vantage/config';
import { getGraphToken } from './mailer';

// Polls the M365 inbox every scheduler tick (15 min) for replies to sent emails.
// We store Graph API conversationId in email.resendMessageId so we can query by it.

export async function checkForReplies(): Promise<void> {
  const env = getEnv();
  const mailbox = env.M365_FROM_EMAIL;

  // Find sent emails that belong to active threads and have a conversation ID stored
  const sentEmails = await prisma.email.findMany({
    where: {
      status: 'sent',
      resendMessageId: { not: null },
      thread: {
        state: {
          in: ['INITIAL_SENT', 'FOLLOWUP_1_SENT', 'FOLLOWUP_2_SENT', 'FOLLOWUP_3_SENT', 'FOLLOWUP_4_SENT'] as never[],
        },
      },
    },
    include: { thread: true },
    take: 100,
  });

  if (sentEmails.length === 0) return;

  let token: string;
  try {
    token = await getGraphToken();
  } catch (err) {
    console.error('[reply-checker] Could not get M365 token:', err);
    return;
  }

  // De-duplicate: one check per conversationId
  const seen = new Set<string>();

  for (const email of sentEmails) {
    const convId = email.resendMessageId;
    if (!convId || seen.has(convId)) continue;
    seen.add(convId);

    const thread = email.thread;

    try {
      // Query inbox only — replies arrive in our inbox, original sent message is in Sent Items
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/mailFolders/Inbox/messages` +
        `?$filter=conversationId eq '${convId}'&$select=id,from,receivedDateTime&$top=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) continue;

      const data = await res.json() as {
        value: Array<{ id: string; from: { emailAddress: { address: string } }; receivedDateTime: string }>;
      };

      const replies = data.value.filter(
        m => m.from.emailAddress.address.toLowerCase() !== mailbox.toLowerCase()
      );

      if (replies.length === 0) continue;

      console.log(`[reply-checker] Reply detected on conversation ${convId} for thread ${thread.id}`);

      await prisma.$transaction([
        prisma.outreachThread.update({
          where: { id: thread.id },
          data: { state: 'REPLIED', nextActionAt: null },
        }),
        prisma.prospect.update({
          where: { id: thread.prospectId },
          data: { status: 'ENGAGED' },
        }),
        prisma.emailEvent.create({
          data: { emailId: email.id, type: 'replied' },
        }),
      ]);
    } catch (err) {
      console.error(`[reply-checker] Error checking conversation ${convId}:`, err);
    }
  }
}
