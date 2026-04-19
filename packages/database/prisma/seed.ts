import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default TexMG organization (will be linked to Clerk org after auth setup)
  const org = await prisma.organization.upsert({
    where: { clerkOrgId: 'seed_texmg' },
    update: {},
    create: {
      clerkOrgId: 'seed_texmg',
      name: 'TexMG',
      brandConfig: {
        create: {
          companyName: 'TexMG',
          senderName: 'Scott',
          senderEmail: 'scott@texmg.com',
          primaryColor: '#1a1a2e',
          accentColor: '#3b82f6',
          companyAddress: 'Houston, TX',
        },
      },
    },
  });

  // Seed default campaign
  await prisma.campaign.upsert({
    where: { id: 'seed_campaign_default' },
    update: {},
    create: {
      id: 'seed_campaign_default',
      orgId: org.id,
      name: 'Website Audit Outreach',
      dailyNewLimit: 10,
    },
  });

  console.log('Seed complete. Org ID:', org.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
