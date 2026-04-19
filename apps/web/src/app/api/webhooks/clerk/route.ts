import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { prisma } from '@vantage/database';
import { getEnv } from '@vantage/config';

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

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof event;
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'organization.created': {
      const org = event.data as { id: string; name: string };
      await prisma.organization.upsert({
        where: { clerkOrgId: org.id },
        update: {},
        create: {
          clerkOrgId: org.id,
          name: org.name,
          brandConfig: {
            create: {
              companyName: env.TEXMG_COMPANY_NAME,
              senderName: env.TEXMG_SENDER_NAME,
              senderEmail: env.TEXMG_SENDER_EMAIL,
              bookingUrl: env.TEXMG_BOOKING_URL ?? null,
              primaryColor: env.TEXMG_PRIMARY_COLOR,
              accentColor: env.TEXMG_ACCENT_COLOR,
            },
          },
        },
      });
      break;
    }

    case 'user.created': {
      const user = event.data as { id: string; email_addresses: Array<{ email_address: string }>; organization_memberships?: Array<{ organization: { id: string } }> };
      const orgMembership = (user.organization_memberships ?? [])[0];
      if (!orgMembership) break;

      const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgMembership.organization.id } });
      if (!org) break;

      await prisma.user.upsert({
        where: { clerkUserId: user.id },
        update: {},
        create: {
          clerkUserId: user.id,
          orgId: org.id,
          email: user.email_addresses[0]?.email_address ?? '',
        },
      });
      break;
    }
  }

  return new Response('OK', { status: 200 });
}
