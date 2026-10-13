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
} from '@study-lab/schema/apis';

import type { Router as ExpressRouter, Request, Response } from 'express';
import type { Redis } from 'ioredis';

import { loggerFor } from '../../../../services/logger';

const CODE_TTL_SECONDS = 60;
const SEND_RATE_TTL_SECONDS = 60;
const SESSION_TTL_SECONDS = 30 * 60;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_ATTEMPT_TTL_SECONDS = CODE_TTL_SECONDS;

const smsCodeKey = (phone: string): string => `sms:code:${phone}`;
const sendRateKey = (phone: string): string => `sms:send:${phone}`;
const sessionKey = (token: string): string => `session:${token}`;
const loginAttemptKey = (phone: string): string => `sms:attempts:${phone}`;

const bearerToken = (authorization?: string): string | undefined =>
  /^Bearer\s+(.+)$/i.exec(authorization ?? '')?.[1];

type SessionValue = { phone: string; createdAt: number };

const error = (message: string) =>
  SmsLoginErrorSchema.parse({ error: message });

/**
 * 统一的业务日志出口：优先使用 pino-http 请求级 logger（phone 字段被脱敏），
 * 缺失时回退到兜底 logger。
 */
const step = (req: Request, name: string, fields: object, message: string) => {
  loggerFor(req).info(
    { demo: 'sms-login', ...fields },
    `[sms-login] ${name}: ${message}`,
  );
};

/**
 * 安全解析 Redis 中的会话 JSON；损坏或缺失则返回 undefined，避免抛 500。
 */
const parseSession = (raw: string): SessionValue | undefined => {
  try {
    const parsed = JSON.parse(raw) as Partial<SessionValue>;

    return typeof parsed.phone === 'string' &&
      typeof parsed.createdAt === 'number'
      ? { phone: parsed.phone, createdAt: parsed.createdAt }
      : undefined;
  } catch {
    return undefined;
  }
};

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
    const allowed = await redis!.set(
      sendRateKey(phone),
      '1',
      'EX',
      SEND_RATE_TTL_SECONDS,
      'NX',
    );

    if (allowed !== 'OK') {
      const retryAfter = await redis!.ttl(sendRateKey(phone));

      step(
        req,
        'send-code',
        { phone },
        `${SEND_RATE_TTL_SECONDS}s 内重复请求被拒（SET NX + EX 未过期）`,
      );
      res.status(429).json(
        SendCodeRateLimitedSchema.parse({
          error: '请求过于频繁，请稍后再试',
          retryAfterSeconds: retryAfter,
        }),
      );
      return;
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

    await redis!.set(smsCodeKey(phone), code, 'EX', CODE_TTL_SECONDS);
    step(
      req,
      'send-code',
      { phone },
      `生成验证码并写入 ${smsCodeKey(phone)}（EX ${CODE_TTL_SECONDS}s）`,
    );
    res.json(
      SendCodeResponseSchema.parse({
        phone,
        code,
        ttlSeconds: CODE_TTL_SECONDS,
      }),
    );
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

    // 尝试次数限流：超限直接作废验证码，阻止针对 6 位码的暴力枚举。
    const attempts = Number((await redis!.get(loginAttemptKey(phone))) ?? 0);

    if (attempts >= LOGIN_MAX_ATTEMPTS) {
      await redis!.del(smsCodeKey(phone));
      step(
        req,
        'login',
        { phone },
        `尝试次数超限（${attempts}），作废验证码`,
      );
      res.status(429).json(error('尝试次数过多，请重新获取验证码'));
      return;
    }

    const stored = await redis!.get(smsCodeKey(phone));

    if (stored !== code) {
      const next = attempts + 1;

      await redis!.set(
        loginAttemptKey(phone),
        String(next),
        'EX',
        LOGIN_ATTEMPT_TTL_SECONDS,
      );
      step(
        req,
        'login',
        { phone },
        `验证码不匹配或已过期（第 ${next} 次失败）`,
      );
      res.status(400).json(error('验证码错误或已过期'));
      return;
    }

    // 验证码一次性：无论校验是否继续成功都先删除，避免重放。
    await redis!.del(smsCodeKey(phone));
    await redis!.del(loginAttemptKey(phone));
    step(req, 'login', { phone }, '校验通过，DEL 验证码并清零尝试计数（一次性）');

    const token = randomBytes(24).toString('hex');
    const session: SessionValue = { phone, createdAt: Date.now() };

    // Session 存进共享 Redis，多实例读取同一份；EX 控制有效期。
    await redis!.set(
      sessionKey(token),
      JSON.stringify(session),
      'EX',
      SESSION_TTL_SECONDS,
    );
    step(
      req,
      'login',
      { phone },
      `建立会话 ${sessionKey(token)}（EX ${SESSION_TTL_SECONDS}s）`,
    );
    res.json(
      LoginResponseSchema.parse({
        token,
        phone,
        expiresInSeconds: SESSION_TTL_SECONDS,
      }),
    );
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
      step(req, 'me', {}, `${sessionKey(token)} 不存在或已过期`);
      res.status(401).json(error('会话不存在或已过期'));
      return;
    }

    const session = parseSession(raw);

    if (!session) {
      step(req, 'me', {}, `${sessionKey(token)} 值损坏，视为失效`);
      res.status(401).json(error('会话不存在或已过期'));
      return;
    }

    // 滑动过期：每次访问续期，活跃用户不会掉线。
    await redis!.expire(sessionKey(token), SESSION_TTL_SECONDS);
    step(
      req,
      'me',
      {},
      `${sessionKey(token)} 命中，EXPIRE 续期至 ${SESSION_TTL_SECONDS}s`,
    );
    res.json(
      MeResponseSchema.parse({
        phone: session.phone,
        token,
        remainingSeconds: SESSION_TTL_SECONDS,
        refreshed: true,
      }),
    );
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

    step(
      req,
      'logout',
      {},
      `DEL ${sessionKey(token)} -> ${deleted === 1 ? '已删除' : '不存在'}`,
    );
    res.json(LogoutResponseSchema.parse({ ok: deleted === 1 }));
  });

  const collectSessionKeys = async (
    cursor: string,
    acc: string[] = [],
  ): Promise<string[]> => {
    const [nextCursor, keys] = await redis!.scan(
      cursor,
      'MATCH',
      'session:*',
      'COUNT',
      100,
    );

    if (nextCursor === '0') {
      return acc.concat(keys);
    }

    return collectSessionKeys(nextCursor, acc.concat(keys));
  };

  router.get('/sessions', async (req, res) => {
    // 会话列表暴露手机号与有效 token，属于敏感能力：生产环境关闭，仅教学环境可用。
    if (process.env.NODE_ENV === 'production') {
      step(req, 'sessions', {}, '生产环境拒绝暴露会话列表');
      res.status(403).json(error('会话列表在生产环境不可用'));
      return;
    }

    if (!redisRequired(res)) {
      return;
    }

    const keys = await collectSessionKeys('0');
    const entries = await Promise.all(
      keys.map(async (key) => {
        const raw = await redis!.get(key);
        const remaining = await redis!.ttl(key);

        if (!raw) {
          return undefined;
        }

        const session = parseSession(raw);

        if (!session) {
          return undefined;
        }

        return SessionEntrySchema.parse({
          phone: session.phone,
          token: key.slice('session:'.length),
          remainingSeconds: remaining,
        });
      }),
    );
    const sessions = entries.filter(
      (entry): entry is NonNullable<typeof entry> => Boolean(entry),
    );

    step(req, 'sessions', {}, `扫描到 ${sessions.length} 个活跃会话（SCAN session:*）`);
    res.json(
      SessionsResponseSchema.parse({ count: sessions.length, sessions }),
    );
  });

  return router;
};
