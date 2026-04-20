import IORedis from 'ioredis';
import { getEnv } from '@vantage/config';

let _redis: IORedis | null = null;

export function getRedis(): IORedis {
  if (_redis) return _redis;
  const env = getEnv();
  const isUpstash = env.UPSTASH_REDIS_URL.startsWith('rediss://');
  _redis = new IORedis(env.UPSTASH_REDIS_URL, {
    ...(isUpstash && { password: env.UPSTASH_REDIS_TOKEN, tls: { rejectUnauthorized: true } }),
    maxRetriesPerRequest: null, // required for BullMQ
    enableReadyCheck: false,
  });
  return _redis;
}
