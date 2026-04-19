import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { prisma } from '@vantage/database';
import { getEnv } from '@vantage/config';

type ResendWebhookEvent = {
  type: string;
  data: {
    email_id: string;
    to: string[];
    click?: { link: string };
    bounce?: { message: string };
    created_at: string;
  };
};

export async function POST(req: Request) {
  const env = getEnv();
  const body = await req.text();
  const headersList = await headers();

  const svixId = headersList.get('svix-id');
  const svixTimestamp = headersList.get('svix-timestamp');
  const svixSignature = headersList.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  let event: ResendWebhookEvent;
  try {
    const wh = new Webhook(env.RESEND_WEBHOOK_SECRET);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendWebhookEvent;
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const resendMessageId = event.data.email_id;
  const email = await prisma.email.findFirst({ where: { resendMessageId } });
  if (!email) return new Response('Email not found', { status: 200 }); // idempotent

  const now = new Date();

  switch (event.type) {
    case 'email.opened':
      await Promise.all([
        prisma.emailEvent.create({
          data: { emailId: email.id, type: 'opened', createdAt: now },
        }),
        // Transition thread to ENGAGED if it's in INITIAL_SENT
        prisma.outreachThread.updateMany({
          where: { emails: { some: { id: email.id } }, state: { in: ['INITIAL_SENT', 'FOLLOWUP_1_SENT', 'FOLLOWUP_2_SENT', 'FOLLOWUP_3_SENT', 'FOLLOWUP_4_SENT'] } },
          data: {},
        }),
        prisma.prospect.updateMany({
          where: { threads: { some: { emails: { some: { id: email.id } } } } },
          data: { status: 'ENGAGED' },
        }),
      ]);
      break;

    case 'email.clicked':
      await prisma.emailEvent.create({
        data: { emailId: email.id, type: 'clicked', url: event.data.click?.link, createdAt: now },
      });
      break;

    case 'email.replied':
      await Promise.all([
        prisma.emailEvent.create({
          data: { emailId: email.id, type: 'replied', createdAt: now },
        }),
        prisma.outreachThread.updateMany({
          where: { emails: { some: { id: email.id } } },
          data: { state: 'REPLIED', nextActionAt: null },
        }),
        prisma.prospect.updateMany({
          where: { threads: { some: { emails: { some: { id: email.id } } } } },
          data: { status: 'ENGAGED' },
        }),
      ]);
      break;

    case 'email.bounced':
      await Promise.all([
        prisma.emailEvent.create({
          data: { emailId: email.id, type: 'bounced', createdAt: now },
        }),
        prisma.outreachThread.updateMany({
          where: { emails: { some: { id: email.id } } },
          data: { state: 'BOUNCED', nextActionAt: null },
        }),
        // Add to suppression list
        (async () => {
          const thread = await prisma.outreachThread.findFirst({
            where: { emails: { some: { id: email.id } } },
            include: { prospect: { include: { contacts: { where: { id: email.contactId } } } } },
          });
          const contact = thread?.prospect.contacts[0];
          if (contact?.email && thread) {
            await prisma.suppressionEntry.upsert({
              where: { orgId_type_value: { orgId: thread.prospect.orgId, type: 'EMAIL', value: contact.email } },
              update: {},
              create: { orgId: thread.prospect.orgId, type: 'EMAIL', value: contact.email, reason: 'hard_bounce' },
            });
          }
        })(),
      ]);
      break;

    case 'email.complained':
      await Promise.all([
        prisma.emailEvent.create({ data: { emailId: email.id, type: 'complained', createdAt: now } }),
        prisma.outreachThread.updateMany({
          where: { emails: { some: { id: email.id } } },
          data: { state: 'OPTED_OUT', nextActionAt: null },
        }),
        (async () => {
          const thread = await prisma.outreachThread.findFirst({
            where: { emails: { some: { id: email.id } } },
            include: { prospect: { include: { contacts: { where: { id: email.contactId } } } } },
          });
          const contact = thread?.prospect.contacts[0];
          if (contact?.email && thread) {
            await prisma.suppressionEntry.upsert({
              where: { orgId_type_value: { orgId: thread.prospect.orgId, type: 'EMAIL', value: contact.email } },
              update: {},
              create: { orgId: thread.prospect.orgId, type: 'EMAIL', value: contact.email, reason: 'spam_complaint' },
            });
          }
        })(),
      ]);
      break;
  }

  return new Response('OK', { status: 200 });
}
