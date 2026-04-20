import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_OPTIONS } from '@vantage/queue';
import { getRedis } from '../lib/redis';

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

export const prospectsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.prospect.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.status ? { status: input.status as never } : {}),
          ...(input.search ? {
            OR: [
              { companyName: { contains: input.search } },
              { domain: { contains: input.search } },
            ],
          } : {}),
          ...(input.cursor ? { id: { lt: input.cursor } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: {
          contacts: { where: { isPrimary: true }, take: 1 },
          _count: { select: { audits: true, reports: true } },
        },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.id, orgId: ctx.orgId },
        include: {
          contacts: true,
          audits: { orderBy: { createdAt: 'desc' }, take: 1 },
          reports: { orderBy: { createdAt: 'desc' }, take: 1 },
          briefs: { orderBy: { createdAt: 'desc' }, take: 1 },
          painPoints: { orderBy: { createdAt: 'desc' }, take: 1 },
          threads: { include: { emails: { include: { events: true } }, campaign: true } },
        },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });
      return prospect;
    }),

  create: protectedProcedure
    .input(z.object({
      domain: z.string().min(1),
      companyName: z.string().optional(),
      industry: z.string().optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const domain = input.domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
      return ctx.prisma.prospect.create({
        data: {
          orgId: ctx.orgId,
          domain,
          companyName: input.companyName,
          industry: input.industry,
          city: input.city,
          status: 'NEW',
        },
      });
    }),

  triggerAudit: protectedProcedure
    .input(z.object({ prospectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });

      const audit = await ctx.prisma.websiteAudit.create({
        data: {
          prospectId: prospect.id,
          domain: prospect.domain,
          triggeredBy: ctx.userId,
          status: 'pending',
        },
      });

      await ctx.prisma.prospect.update({
        where: { id: prospect.id },
        data: { status: 'AUDITING' },
      });

      const redis = getRedis();
      const queue = new Queue(QUEUE_NAMES.AUDIT_CRAWL, { connection: redis });
      await queue.add('crawl', {
        orgId: ctx.orgId,
        prospectId: prospect.id,
        auditId: audit.id,
        domain: prospect.domain,
      }, JOB_OPTIONS[QUEUE_NAMES.AUDIT_CRAWL]);

      return { auditId: audit.id };
    }),

  triggerFullPipeline: protectedProcedure
    .input(z.object({ prospectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });

      const workflowRun = await ctx.prisma.workflowRun.create({
        data: {
          orgId: ctx.orgId,
          prospectId: prospect.id,
          type: 'full_pipeline',
          status: 'running',
        },
      });

      const redis = getRedis();
      const queue = new Queue(QUEUE_NAMES.WORKFLOW_ORCHESTRATE, { connection: redis });
      await queue.add('workflow', {
        orgId: ctx.orgId,
        prospectId: prospect.id,
        workflowRunId: workflowRun.id,
        runEnrich: true,
        runAudit: true,
        runReport: true,
        runOutreach: false, // operator approves outreach manually
      }, JOB_OPTIONS[QUEUE_NAMES.WORKFLOW_ORCHESTRATE]);

      return { workflowRunId: workflowRun.id };
    }),

  suppress: protectedProcedure
    .input(z.object({ prospectId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
        include: { contacts: true },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });

      // Add email suppressions for all contacts
      for (const contact of prospect.contacts) {
        if (!contact.email) continue;
        await ctx.prisma.suppressionEntry.upsert({
          where: { orgId_type_value: { orgId: ctx.orgId, type: 'EMAIL', value: contact.email } },
          update: {},
          create: { orgId: ctx.orgId, type: 'EMAIL', value: contact.email, reason: input.reason },
        });
      }

      await ctx.prisma.prospect.update({
        where: { id: prospect.id },
        data: { status: 'SUPPRESSED' },
      });

      return { success: true };
    }),

  markConverted: protectedProcedure
    .input(z.object({ prospectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });
      return ctx.prisma.prospect.update({
        where: { id: input.prospectId },
        data: { status: 'CONVERTED' },
      });
    }),

  addContact: protectedProcedure
    .input(z.object({
      prospectId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email(),
      title: z.string().optional(),
      isPrimary: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const prospect = await ctx.prisma.prospect.findFirst({
        where: { id: input.prospectId, orgId: ctx.orgId },
      });
      if (!prospect) throw new TRPCError({ code: 'NOT_FOUND' });

      // Check suppression
      const suppressed = await ctx.prisma.suppressionEntry.findFirst({
        where: { orgId: ctx.orgId, type: 'EMAIL', value: input.email.toLowerCase() },
      });
      if (suppressed) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This email is on the suppression list' });

      if (input.isPrimary) {
        await ctx.prisma.contact.updateMany({
          where: { prospectId: input.prospectId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return ctx.prisma.contact.create({
        data: {
          prospectId: input.prospectId,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          email: input.email.toLowerCase().trim(),
          title: input.title ?? null,
          isPrimary: input.isPrimary,
          emailSource: 'manual',
        },
      });
    }),

  removeContact: protectedProcedure
    .input(z.object({ contactId: z.string(), prospectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.prisma.contact.findFirst({
        where: { id: input.contactId, prospectId: input.prospectId, prospect: { orgId: ctx.orgId } },
      });
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND' });
      await ctx.prisma.contact.delete({ where: { id: input.contactId } });
      return { success: true };
    }),

  setContactPrimary: protectedProcedure
    .input(z.object({ contactId: z.string(), prospectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.prisma.contact.findFirst({
        where: { id: input.contactId, prospectId: input.prospectId, prospect: { orgId: ctx.orgId } },
      });
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND' });
      await ctx.prisma.contact.updateMany({
        where: { prospectId: input.prospectId, isPrimary: true },
        data: { isPrimary: false },
      });
      await ctx.prisma.contact.update({
        where: { id: input.contactId },
        data: { isPrimary: true },
      });
      return { success: true };
    }),

  importCsv: protectedProcedure
    .input(z.object({
      csv: z.string().max(500_000),
      triggerPipeline: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const lines = input.csv.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new TRPCError({ code: 'BAD_REQUEST', message: 'CSV must have a header row and at least one data row' });

      const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      const col = (name: string) => header.indexOf(name);

      const domainIdx = col('domain');
      if (domainIdx === -1) throw new TRPCError({ code: 'BAD_REQUEST', message: 'CSV must have a "domain" column' });

      const companyNameIdx = col('companyname');
      const contactEmailIdx = col('contactemail');
      const contactNameIdx = col('contactname');
      const contactTitleIdx = col('contacttitle');

      // Get suppressions and existing domains for dedup
      const [suppressions, existing] = await Promise.all([
        ctx.prisma.suppressionEntry.findMany({ where: { orgId: ctx.orgId, type: 'DOMAIN' }, select: { value: true } }),
        ctx.prisma.prospect.findMany({ where: { orgId: ctx.orgId }, select: { domain: true } }),
      ]);
      const suppressedDomains = new Set(suppressions.map((s: { value: string }) => s.value));
      const existingDomains = new Set(existing.map((p: { domain: string }) => p.domain));

      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const line of lines.slice(1)) {
        if (!line) continue;
        const cells = parseCsvLine(line);
        const rawDomain = cells[domainIdx] ?? '';
        const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '').toLowerCase().trim();

        if (!domain || !domain.includes('.')) { failed++; continue; }
        if (existingDomains.has(domain) || suppressedDomains.has(domain)) { skipped++; continue; }

        try {
          const prospect = await ctx.prisma.prospect.create({
            data: {
              orgId: ctx.orgId,
              domain,
              companyName: companyNameIdx >= 0 ? (cells[companyNameIdx] ?? undefined) : undefined,
              status: 'NEW',
            },
          });
          existingDomains.add(domain);

          const contactEmail = contactEmailIdx >= 0 ? cells[contactEmailIdx] : undefined;
          if (contactEmail && contactEmail.includes('@')) {
            const fullName = contactNameIdx >= 0 ? cells[contactNameIdx] ?? '' : '';
            const [firstName, ...rest] = fullName.split(' ');
            await ctx.prisma.contact.create({
              data: {
                prospectId: prospect.id,
                email: contactEmail.toLowerCase().trim(),
                firstName: firstName || null,
                lastName: rest.join(' ') || null,
                title: contactTitleIdx >= 0 ? (cells[contactTitleIdx] ?? null) : null,
                isPrimary: true,
                emailSource: 'csv_import',
              },
            });
          }

          if (input.triggerPipeline) {
            const workflowRun = await ctx.prisma.workflowRun.create({
              data: { orgId: ctx.orgId, prospectId: prospect.id, type: 'full_pipeline', status: 'running' },
            });
            const redis = getRedis();
            const queue = new Queue(QUEUE_NAMES.WORKFLOW_ORCHESTRATE, { connection: redis });
            await queue.add('workflow', {
              orgId: ctx.orgId, prospectId: prospect.id, workflowRunId: workflowRun.id,
              runEnrich: true, runAudit: true, runReport: true, runOutreach: false,
            }, JOB_OPTIONS[QUEUE_NAMES.WORKFLOW_ORCHESTRATE]);
          }

          imported++;
        } catch {
          failed++;
        }
      }

      return { imported, skipped, failed, total: lines.length - 1 };
    }),
});
