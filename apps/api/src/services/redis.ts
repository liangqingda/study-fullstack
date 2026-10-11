import { Redis } from 'ioredis';

export const createRedisClient = (url: string): Redis => {
  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: false,
  });

  /*
   * 未监听的 'error' 事件会令 EventEmitter 抛出未处理异常导致进程崩溃；
   * 连接失败/重连失败在此统一记录，避免进程被 Redis 故障拖垮。
   */
  redis.on('error', (error) => {
    const code = (error as NodeJS.ErrnoException).code ?? 'unknown';

    console.error(`[redis] client error (${code})`);
  });

  return redis;
};
