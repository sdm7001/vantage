import { prisma } from '@vantage/database';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_OPTIONS } from '@vantage/queue';
import { getRedis } from '../lib/redis';

// BullMQ cron: runs every 15 minutes
// Finds threads due for next followup and enqueues them

export async function runFollowupScheduler(): Promise<void> {
  const now = new Date();

  const dueThreads = await prisma.outreachThread.findMany({
    where: {
      nextActionAt: { lte: now },
      state: {
        in: ['INITIAL_SENT', 'FOLLOWUP_1_SENT', 'FOLLOWUP_2_SENT', 'FOLLOWUP_3_SENT'],
      },
    },
    include: {
      prospect: {
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
    take: 50, // process up to 50 per tick
  });

  if (dueThreads.length === 0) return;

  const followupQueue = new Queue(QUEUE_NAMES.OUTREACH_FOLLOWUP, { connection: getRedis() });

  const STATE_TO_NEXT_STEP: Record<string, number> = {
    INITIAL_SENT: 1,
    FOLLOWUP_1_SENT: 2,
    FOLLOWUP_2_SENT: 3,
    FOLLOWUP_3_SENT: 4,
  };

  for (const thread of dueThreads) {
    const nextStep = STATE_TO_NEXT_STEP[thread.state];
    if (!nextStep || nextStep > 4) continue;

    const contact = thread.prospect.contacts[0];
    if (!contact) {
      console.warn(`Thread ${thread.id} has no primary contact, skipping`);
      continue;
    }

    // Create email record for this followup
    const emailRecord = await prisma.email.create({
      data: {
        threadId: thread.id,
        contactId: contact.id,
        sequenceIndex: nextStep,
        subject: '',
        htmlBody: '',
        fromName: '',
        fromEmail: '',
        status: 'queued',
      },
    });

    // Mark thread as queued
    const queuedState = `FOLLOWUP_${nextStep}_QUEUED` as never;
    await prisma.outreachThread.update({
      where: { id: thread.id },
      data: { state: queuedState, nextActionAt: null },
    });

    await followupQueue.add(
      `followup-${thread.id}-${nextStep}`,
      {
        orgId: thread.prospect.organization?.id ?? thread.campaignId ?? '',
        prospectId: thread.prospectId,
        contactId: contact.id,
        threadId: thread.id,
        emailId: emailRecord.id,
        sequenceIndex: nextStep,
      },
      JOB_OPTIONS[QUEUE_NAMES.OUTREACH_FOLLOWUP]
    );

    console.log(`Scheduled followup #${nextStep} for thread ${thread.id}`);
  }
}
