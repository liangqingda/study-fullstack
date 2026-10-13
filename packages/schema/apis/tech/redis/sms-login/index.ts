import { z } from 'zod';

import { defineApiInfo, HttpMethodEnum } from '../../../model/api-info';

/**
 * 手机号校验器：取中国大陆 11 位示例；教学简化，仅约束长度与首字。
 */
const phone = () => z.string().regex(/^1\d{10}$/, '手机号应为 11 位数字');

/**
 * 发送验证码的请求体：仅携带手机号。
 */
export const SendCodeRequestSchema = z
  .object({
    /** 接收验证码的手机号。 */
    phone: phone(),
  })
  .openapi('SendCodeRequest')
  .describe('发送验证码的请求体，仅携带手机号');

/**
 * 发送验证码的响应：回传验证码便于教学观察。
 */
export const SendCodeResponseSchema = z
  .object({
    /** 接收验证码的手机号。 */
    phone: phone(),
    /** 6 位数字验证码（演示环境后端回传以便观察；生产环境只应通过短信下发）。 */
    code: z
      .string()
      .length(6)
      .describe('6 位数字验证码（演示环境后端回传以便观察；生产环境只应通过短信下发）'),
    /** 验证码有效期，单位秒。 */
    ttlSeconds: z.number().int().describe('验证码有效期，单位秒'),
  })
  .openapi('SendCodeResponse')
  .describe('发送验证码的响应，回传验证码便于教学观察');

/**
 * 发送验证码被限流的响应。
 */
export const SendCodeRateLimitedSchema = z
  .object({
    /** 错误信息。 */
    error: z.string().describe('错误信息'),
    /** 距下次可发送的等待秒数。 */
    retryAfterSeconds: z.number().int().describe('距下次可发送的等待秒数'),
  })
  .openapi('SendCodeRateLimited')
  .describe('发送验证码被限流的响应');

/**
 * 登录请求体：手机号与验证码。
 */
export const LoginRequestSchema = z
  .object({
    /** 手机号。 */
    phone: phone(),
    /** 6 位数字验证码。 */
    code: z.string().length(6).describe('6 位数字验证码'),
  })
  .openapi('LoginRequest')
  .describe('登录请求体，携带手机号与验证码');

/**
 * 登录成功的响应：会话令牌及有效期。
 */
export const LoginResponseSchema = z
  .object({
    /** 会话令牌。 */
    token: z.string().describe('会话令牌'),
    /** 关联的手机号。 */
    phone: phone(),
    /** 令牌有效期，单位秒。 */
    expiresInSeconds: z.number().int().describe('令牌有效期，单位秒'),
  })
  .openapi('LoginResponse')
  .describe('登录成功的响应，返回会话令牌及有效期');

/**
 * 查询当前会话的响应：令牌与剩余有效期。
 */
export const MeResponseSchema = z
  .object({
    /** 关联的手机号。 */
    phone: phone(),
    /** 会话令牌。 */
    token: z.string().describe('会话令牌'),
    /** 剩余有效期，单位秒。 */
    remainingSeconds: z.number().int().describe('剩余有效期，单位秒'),
    /** 本次请求是否续期了 TTL（滑动过期）。 */
    refreshed: z.boolean().describe('本次请求是否续期了 TTL（滑动过期）'),
  })
  .openapi('MeResponse')
  .describe('查询当前会话的响应，返回令牌与剩余有效期');

/**
 * 登出成功的响应。
 */
export const LogoutResponseSchema = z
  .object({
    /** 是否成功删除会话。 */
    ok: z.boolean().describe('是否成功删除会话'),
  })
  .openapi('LogoutResponse')
  .describe('登出成功的响应');

/**
 * 单个在线会话的摘要。
 */
export const SessionEntrySchema = z
  .object({
    /** 会话关联的手机号。 */
    phone: phone(),
    /** 会话令牌。 */
    token: z.string().describe('会话令牌'),
    /** 剩余有效期，单位秒。 */
    remainingSeconds: z.number().int().describe('剩余有效期，单位秒'),
  })
  .openapi('SessionEntry')
  .describe('单个在线会话的摘要');

/**
 * 列出所有在线会话的响应。
 */
export const SessionsResponseSchema = z
  .object({
    /** 在线会话数量。 */
    count: z.number().int().describe('在线会话数量'),
    /** 在线会话列表。 */
    sessions: z.array(SessionEntrySchema),
  })
  .openapi('SessionsResponse')
  .describe('列出所有在线会话的响应');

/**
 * 短信登录的通用错误响应。
 */
export const SmsLoginErrorSchema = z
  .object({
    /** 错误信息。 */
    error: z.string().describe('错误信息'),
  })
  .openapi('SmsLoginError')
  .describe('短信登录的通用错误响应');

/**
 * 发送验证码的 API 契约：写入 Redis 并设置过期与重发限流。
 */
export const sendCodeApi = defineApiInfo({
  method: HttpMethodEnum.POST,
  path: '/api/tech/redis/sms-login/send-code',
  summary:
    'Send an SMS verification code, stored in Redis with an expiry and resend rate-limit',
  tags: ['SmsLogin'],
  body: SendCodeRequestSchema,
  response: SendCodeResponseSchema,
  errorResponses: { 400: SmsLoginErrorSchema, 429: SendCodeRateLimitedSchema },
});

/**
 * 登录的 API 契约：校验验证码并创建 Redis 共享会话令牌。
 */
export const loginApi = defineApiInfo({
  method: HttpMethodEnum.POST,
  path: '/api/tech/redis/sms-login/login',
  summary: 'Verify the code and create a Redis-backed shared session token',
  tags: ['SmsLogin'],
  body: LoginRequestSchema,
  response: LoginResponseSchema,
  errorResponses: { 400: SmsLoginErrorSchema, 401: SmsLoginErrorSchema },
});

/**
 * 查询会话的 API 契约：读取共享 Redis 中的会话并续期 TTL（滑动过期）。
 */
export const meApi = defineApiInfo({
  method: HttpMethodEnum.GET,
  path: '/api/tech/redis/sms-login/me',
  summary:
    'Read the session from shared Redis and renew its TTL (sliding expiration)',
  tags: ['SmsLogin'],
  response: MeResponseSchema,
  requiresAuth: true,
  errorResponses: { 401: SmsLoginErrorSchema },
});

/**
 * 登出的 API 契约：从 Redis 删除会话。
 */
export const logoutApi = defineApiInfo({
  method: HttpMethodEnum.POST,
  path: '/api/tech/redis/sms-login/logout',
  summary: 'Delete the session from Redis',
  tags: ['SmsLogin'],
  requiresAuth: true,
  response: LogoutResponseSchema,
  errorResponses: { 401: SmsLoginErrorSchema },
});

/**
 * 列出所有在线会话的 API 契约。
 */
export const sessionsApi = defineApiInfo({
  method: HttpMethodEnum.GET,
  path: '/api/tech/redis/sms-login/sessions',
  summary: 'List all live sessions stored in shared Redis',
  tags: ['SmsLogin'],
  response: SessionsResponseSchema,
});
