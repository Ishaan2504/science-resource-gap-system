import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

export let redis: IORedis | null = null;
export let jobs: Queue | null = null;

if (env.redisUrl) {
  try {
    redis = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.on('error', (err) => {
      // Handle connection error gracefully without terminating Node process
      console.warn('[Redis] Connection warning:', err.message);
    });
    jobs = new Queue('science-resource-gap', { connection: redis });
  } catch (e) {
    console.warn('[Redis] Could not initialize Redis queue:', e);
    redis = null;
    jobs = null;
  }
}

export async function enqueueRecompute(kind: 'all' | 'category', categoryId?: string) {
  if (!jobs) {
    return;
  }
  try {
    return await jobs.add(
      'recompute-priority',
      { kind, categoryId },
      { attempts: 5, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 100, removeOnFail: 500 }
    );
  } catch (err) {
    console.warn('[Queue] Could not enqueue recompute job:', err);
  }
}
