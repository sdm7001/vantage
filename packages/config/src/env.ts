import { z } from 'zod';

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'Clerk publishable key required'),
  CLERK_SECRET_KEY: z.string().min(1, 'Clerk secret key required'),
  CLERK_WEBHOOK_SECRET: z.string().optional().default(''),

  // Database (Supabase PostgreSQL)
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),

  // Redis (Upstash)
  UPSTASH_REDIS_URL: z.string().url('Upstash Redis URL required'),
  UPSTASH_REDIS_TOKEN: z.string().default(''),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET_NAME: z.string().default('vantage-reports'),
  R2_PUBLIC_URL: z.string().default(''),

  // Microsoft 365 (Graph API — used for outreach email sending)
  M365_TENANT_ID: z.string().default(''),
  M365_CLIENT_ID: z.string().default(''),
  M365_CLIENT_SECRET: z.string().default(''),
  M365_FROM_EMAIL: z.string().default('noreply@example.com'),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().default(''),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url('App URL required'),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(5),

  // TexMG brand defaults
  TEXMG_COMPANY_NAME: z.string().default('TexMG'),
  TEXMG_SENDER_NAME: z.string().default('Scott'),
  TEXMG_SENDER_EMAIL: z.string().email().default('scott@texmg.com'),
  TEXMG_BOOKING_URL: z.string().url().optional(),
  TEXMG_PRIMARY_COLOR: z.string().default('#8B1E1E'),
  TEXMG_ACCENT_COLOR: z.string().default('#1565C0'),

  // Optional: Google PageSpeed Insights API key
  PSI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map(issue => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}\n\nCheck your .env file.`);
  }

  _env = result.data;
  return _env;
}

// For Next.js public env vars (client-side safe subset)
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  NEXT_PUBLIC_APP_URL: z.string(),
});
