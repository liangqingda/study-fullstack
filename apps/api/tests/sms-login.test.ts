import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Redis } from 'ioredis';

import { createSmsLoginRouter } from '../src/express/sms-login';

/**
 * 轻量内存版 Redis 假实现：支持本路由用到的 set/get/del/expire/ttl/scan，
 * 并真实模拟 EX（过期）与 NX（存在即拒），使限流、一次性、滑动过期逻辑可被验证。
 */
const makeRedis = () => {
  const store = new Map<string, string>();
  const ttlMap = new Map<string, number>();
  let now = Date.now();

  return {
    store,
    __tick: (ms: number) => {
      now += ms;
    },
    async set(
      key: string,
      value: string,
      mode?: string,
      seconds?: number,
      nx?: string,
    ) {
      if (mode === 'EX') {
        if (nx === 'NX' && store.has(key)) {
          return null;
        }

        store.set(key, value);
        ttlMap.set(key, now + (seconds ?? 0) * 1000);
        return 'OK';
      }

      store.set(key, value);
      return 'OK';
    },
    async get(key: string) {
      const expiresAt = ttlMap.get(key);

      if (expiresAt !== undefined && now > expiresAt) {
        store.delete(key);
        ttlMap.delete(key);
        return null;
      }

      return store.get(key) ?? null;
    },
    async del(...keys: string[]) {
      let count = 0;

      for (const key of keys) {
        if (store.delete(key)) {
          ttlMap.delete(key);
          count += 1;
        }
      }

      return count;
    },
    async expire(key: string, seconds: number) {
      if (!store.has(key)) {
        return 0;
      }

      ttlMap.set(key, now + seconds * 1000);
      return 1;
    },
    async ttl(key: string) {
      const expiresAt = ttlMap.get(key);

      if (expiresAt === undefined) {
        return -2;
      }

      return Math.max(0, Math.round((expiresAt - now) / 1000));
    },
    async scan(cursor: string, ...args: string[]) {
      const match = args.includes('MATCH') ? args[args.indexOf('MATCH') + 1] : '*';
      const pattern = new RegExp(`^${match.replace('*', '.*')}$`);

      return [
        '0',
        [...store.keys()].filter((key) => pattern.test(key)),
      ] as [string, string[]];
    },
  };
};

type FakeRedis = ReturnType<typeof makeRedis>;

const appWith = (redis: FakeRedis | undefined) => {
  const app = express();

  app.use(express.json());
  app.use('/api/redis/sms-login', createSmsLoginRouter(redis as unknown as Redis));

  return app;
};

describe('sms-login API', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('send-code returns a code and rate-limits resends within TTL', async () => {
    const redis = makeRedis();
    const app = appWith(redis);
    const first = await request(app).post('/api/redis/sms-login/send-code').send({ phone: '13800138000' });

    expect(first.status).toBe(200);
    expect(first.body.code).toMatch(/^\d{6}$/);
    expect(redis.store.get('sms:code:13800138000')).toBe(first.body.code);

    const second = await request(app).post('/api/redis/sms-login/send-code').send({ phone: '13800138000' });

    expect(second.status).toBe(429);
    expect(second.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('login succeeds with the correct code and consumes it once', async () => {
    const redis = makeRedis();
    const app = appWith(redis);
    const { body: { code } } = await request(app).post('/api/redis/sms-login/send-code').send({ phone: '13800138000' });

    const login = await request(app).post('/api/redis/sms-login/login').send({ phone: '13800138000', code });

    expect(login.status).toBe(200);
    expect(login.body.token).toMatch(/^[0-9a-f]{48}$/);
    expect(redis.store.has('sms:code:13800138000')).toBe(false);

    const replay = await request(app).post('/api/redis/sms-login/login').send({ phone: '13800138000', code });

    expect(replay.status).toBe(400);
  });

  it('login rejects a wrong code and burns the code after too many attempts', async () => {
    const redis = makeRedis();
    const app = appWith(redis);
    const { body: { code } } = await request(app).post('/api/redis/sms-login/send-code').send({ phone: '13800138000' });

    await Promise.all(
      Array.from({ length: 5 }, async () => {
        const wrong = await request(app).post('/api/redis/sms-login/login').send({ phone: '13800138000', code: '000000' });

        expect(wrong.status).toBe(400);
      }),
    );

    // 超过上限后即使验证码仍正确也被作废。
    const over = await request(app).post('/api/redis/sms-login/login').send({ phone: '13800138000', code });

    expect(over.status).toBe(429);
    expect(redis.store.has('sms:code:13800138000')).toBe(false);
  });

  it('me returns the phone and refreshes the session; logout removes it', async () => {
    const redis = makeRedis();
    const app = appWith(redis);
    const { body: { code } } = await request(app).post('/api/redis/sms-login/send-code').send({ phone: '13800138000' });
    const { body: { token } } = await request(app).post('/api/redis/sms-login/login').send({ phone: '13800138000', code });
    const bearer = `Bearer ${token}`;

    const me = await request(app).get('/api/redis/sms-login/me').set('Authorization', bearer);

    expect(me.status).toBe(200);
    expect(me.body.phone).toBe('13800138000');
    expect(me.body.refreshed).toBe(true);
    expect(me.body.remainingSeconds).toBe(1800);

    const missing = await request(app).get('/api/redis/sms-login/me').set('Authorization', 'Bearer nope');

    expect(missing.status).toBe(401);

    const logout = await request(app).post('/api/redis/sms-login/logout').set('Authorization', bearer);

    expect(logout.status).toBe(200);
    expect(logout.body.ok).toBe(true);

    const after = await request(app).get('/api/redis/sms-login/me').set('Authorization', bearer);

    expect(after.status).toBe(401);
  });

  it('sessions lists active sessions in development but is blocked in production', async () => {
    const redis = makeRedis();
    const app = appWith(redis);
    const { body: { code } } = await request(app).post('/api/redis/sms-login/send-code').send({ phone: '13800138000' });

    await request(app).post('/api/redis/sms-login/login').send({ phone: '13800138000', code });

    const list = await request(app).get('/api/redis/sms-login/sessions');

    expect(list.status).toBe(200);
    expect(list.body.count).toBe(1);
    expect(list.body.sessions[0].phone).toBe('13800138000');

    vi.stubEnv('NODE_ENV', 'production');
    const blocked = await request(app).get('/api/redis/sms-login/sessions');

    expect(blocked.status).toBe(403);
  });

  it('returns 503 when Redis is not configured', async () => {
    const app = appWith(undefined);
    const response = await request(app).post('/api/redis/sms-login/send-code').send({ phone: '13800138000' });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('Redis is not configured');
  });
});
