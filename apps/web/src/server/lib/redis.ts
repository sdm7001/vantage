import IORedis from 'ioredis';
import { getEnv } from '@vantage/config';

export function getRedis() {
  const env = getEnv();
  const isUpstash = env.UPSTASH_REDIS_URL.startsWith('rediss://');
  return new IORedis(env.UPSTASH_REDIS_URL, {
    ...(isUpstash && { password: env.UPSTASH_REDIS_TOKEN, tls: { rejectUnauthorized: true } }),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
