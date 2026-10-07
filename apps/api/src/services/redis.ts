import { Redis } from 'ioredis';

export const createRedisClient = (url: string): Redis =>
  new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: false,
  });
