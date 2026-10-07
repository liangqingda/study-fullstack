import { randomBytes, randomInt } from 'node:crypto';

import { Router } from 'express';
import {
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  MeResponseSchema,
  SendCodeRateLimitedSchema,
  SendCodeRequestSchema,
  SendCodeResponseSchema,
  SessionEntrySchema,
  SessionsResponseSchema,
  SmsLoginErrorSchema,
} from '@liangqingda/study-nodejs-schema/apis';

import type { Router as ExpressRouter, Response } from 'express';
import type { Redis } from 'ioredis';

const CODE_TTL_SECONDS = 60;
const SEND_RATE_TTL_SECONDS = 60;
const SESSION_TTL_SECONDS = 30 * 60;

const smsCodeKey = (phone: string): string => `sms:code:${phone}`;
const sendRateKey = (phone: string): string => `sms:send:${phone}`;
const sessionKey = (token: string): string => `session:${token}`;

const bearerToken = (authorization?: string): string | undefined =>
  /^Bearer\s+(.+)$/i.exec(authorization ?? '')?.[1];

type SessionValue = { phone: string; createdAt: number };

const error = (message: string) => SmsLoginErrorSchema.parse({ error: message });

const step = (name: string, message: string): void => console.info(`[sms-login] ${name}: ${message}`);

export const createSmsLoginRouter = (redis?: Redis): ExpressRouter => {
  const router: ExpressRouter = Router();

  const redisRequired = (res: Response): boolean => {
    if (redis) {
      return true;
    }

    res.status(503).json(error('Redis is not configured'));

    return false;
  };

  router.post('/send-code', async (req, res) => {
    const input = SendCodeRequestSchema.safeParse(req.body);

    if (!input.success) {
      res.status(400).json(error('手机号应为 11 位数字'));
      return;
    }

    if (!redisRequired(res)) {
      return;
    }

    const { phone } = input.data;
    const allowed = await redis!.set(sendRateKey(phone), '1', 'EX', SEND_RATE_TTL_SECONDS, 'NX');

    if (allowed !== 'OK') {
      const retryAfter = await redis!.ttl(sendRateKey(phone));

      step('send-code', `${phone} 在 ${SEND_RATE_TTL_SECONDS}s 内重复请求，拒绝（SET NX + EX 未过期）`);
      res.status(429).json(SendCodeRateLimitedSchema.parse({ error: '请求过于频繁，请稍后再试', retryAfterSeconds: retryAfter }));
      return;
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

    await redis!.set(smsCodeKey(phone), code, 'EX', CODE_TTL_SECONDS);
    step('send-code', `${phone} 生成验证码并写入 ${smsCodeKey(phone)}（EX ${CODE_TTL_SECONDS}s）`);
    res.json(SendCodeResponseSchema.parse({ phone, code, ttlSeconds: CODE_TTL_SECONDS }));
  });

  router.post('/login', async (req, res) => {
    const input = LoginRequestSchema.safeParse(req.body);

    if (!input.success) {
      res.status(400).json(error('参数无效：手机号或验证码格式不正确'));
      return;
    }

    if (!redisRequired(res)) {
      return;
    }

    const { phone, code } = input.data;
    const stored = await redis!.get(smsCodeKey(phone));

    if (stored !== code) {
      step('login', `${phone} 验证码不匹配或已过期（GET ${smsCodeKey(phone)} -> ${stored ?? 'nil'}）`);
      res.status(400).json(error('验证码错误或已过期'));
      return;
    }

    // 验证码一次性：无论校验是否继续成功都先删除，避免重放。
    await redis!.del(smsCodeKey(phone));
    step('login', `${phone} 校验通过，DEL ${smsCodeKey(phone)}（一次性）`);

    const token = randomBytes(24).toString('hex');
    const session: SessionValue = { phone, createdAt: Date.now() };

    // Session 存进共享 Redis，多实例读取同一份；EX 控制有效期。
    await redis!.set(sessionKey(token), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
    step('login', `${phone} 建立会话 ${sessionKey(token)}（EX ${SESSION_TTL_SECONDS}s）`);
    res.json(LoginResponseSchema.parse({ token, phone, expiresInSeconds: SESSION_TTL_SECONDS }));
  });

  router.get('/me', async (req, res) => {
    const token = bearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json(error('缺少 Bearer Token'));
      return;
    }

    if (!redisRequired(res)) {
      return;
    }

    const raw = await redis!.get(sessionKey(token));

    if (!raw) {
      step('me', `${sessionKey(token)} 不存在或已过期`);
      res.status(401).json(error('会话不存在或已过期'));
      return;
    }

    const session = JSON.parse(raw) as SessionValue;

    // 滑动过期：每次访问续期，活跃用户不会掉线。
    await redis!.expire(sessionKey(token), SESSION_TTL_SECONDS);
    step('me', `${sessionKey(token)} 命中，EXPIRE 续期至 ${SESSION_TTL_SECONDS}s`);
    res.json(MeResponseSchema.parse({ phone: session.phone, token, remainingSeconds: SESSION_TTL_SECONDS, refreshed: true }));
  });

  router.post('/logout', async (req, res) => {
    const token = bearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json(error('缺少 Bearer Token'));
      return;
    }

    if (!redisRequired(res)) {
      return;
    }

    const deleted = await redis!.del(sessionKey(token));

    step('logout', `DEL ${sessionKey(token)} -> ${deleted === 1 ? '已删除' : '不存在'}`);
    res.json(LogoutResponseSchema.parse({ ok: deleted === 1 }));
  });

  const collectSessionKeys = async (cursor: string, acc: string[] = []): Promise<string[]> => {
    const [nextCursor, keys] = await redis!.scan(cursor, 'MATCH', 'session:*', 'COUNT', 100);

    if (nextCursor === '0') {
      return acc.concat(keys);
    }

    return collectSessionKeys(nextCursor, acc.concat(keys));
  };

  router.get('/sessions', async (_req, res) => {
    if (!redisRequired(res)) {
      return;
    }

    const keys = await collectSessionKeys('0');
    const entries = await Promise.all(keys.map(async (key) => {
      const raw = await redis!.get(key);
      const remaining = await redis!.ttl(key);

      if (!raw) {
        return undefined;
      }

      const session = JSON.parse(raw) as SessionValue;

      return SessionEntrySchema.parse({ phone: session.phone, token: key.slice('session:'.length), remainingSeconds: remaining });
    }));
    const sessions = entries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    step('sessions', `扫描到 ${sessions.length} 个活跃会话（SCAN session:*）`);
    res.json(SessionsResponseSchema.parse({ count: sessions.length, sessions }));
  });

  return router;
};
