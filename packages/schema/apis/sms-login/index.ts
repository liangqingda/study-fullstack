import { z } from 'zod';

import { defineApiInfo, HttpMethodEnum } from '../model/api-info';

// 手机号取中国大陆 11 位示例；教学简化，仅约束长度与首字。
const phone = () => z.string().regex(/^1\d{10}$/, '手机号应为 11 位数字');

export const SendCodeRequestSchema = z.object({
  phone: phone(),
}).openapi('SendCodeRequest');

export const SendCodeResponseSchema = z.object({
  phone: phone(),
  // 演示环境后端把验证码回传给页面以便观察；生产环境只应通过短信下发。
  code: z.string().length(6),
  ttlSeconds: z.number().int(),
}).openapi('SendCodeResponse');

export const SendCodeRateLimitedSchema = z.object({
  error: z.string(),
  retryAfterSeconds: z.number().int(),
}).openapi('SendCodeRateLimited');

export const LoginRequestSchema = z.object({
  phone: phone(),
  code: z.string().length(6),
}).openapi('LoginRequest');

export const LoginResponseSchema = z.object({
  token: z.string(),
  phone: phone(),
  expiresInSeconds: z.number().int(),
}).openapi('LoginResponse');

export const MeResponseSchema = z.object({
  phone: phone(),
  token: z.string(),
  remainingSeconds: z.number().int(),
  refreshed: z.boolean(),
}).openapi('MeResponse');

export const LogoutResponseSchema = z.object({
  ok: z.boolean(),
}).openapi('LogoutResponse');

export const SessionEntrySchema = z.object({
  phone: phone(),
  token: z.string(),
  remainingSeconds: z.number().int(),
}).openapi('SessionEntry');

export const SessionsResponseSchema = z.object({
  count: z.number().int(),
  sessions: z.array(SessionEntrySchema),
}).openapi('SessionsResponse');

export const SmsLoginErrorSchema = z.object({
  error: z.string(),
}).openapi('SmsLoginError');

export const sendCodeApi = defineApiInfo({
  method: HttpMethodEnum.POST,
  path: '/api/sms-login/send-code',
  summary: 'Send an SMS verification code, stored in Redis with an expiry and resend rate-limit',
  tags: ['SmsLogin'],
  body: SendCodeRequestSchema,
  response: SendCodeResponseSchema,
  errorResponses: { 400: SmsLoginErrorSchema, 429: SendCodeRateLimitedSchema },
});

export const loginApi = defineApiInfo({
  method: HttpMethodEnum.POST,
  path: '/api/sms-login/login',
  summary: 'Verify the code and create a Redis-backed shared session token',
  tags: ['SmsLogin'],
  body: LoginRequestSchema,
  response: LoginResponseSchema,
  errorResponses: { 400: SmsLoginErrorSchema, 401: SmsLoginErrorSchema },
});

export const meApi = defineApiInfo({
  method: HttpMethodEnum.GET,
  path: '/api/sms-login/me',
  summary: 'Read the session from shared Redis and renew its TTL (sliding expiration)',
  tags: ['SmsLogin'],
  response: MeResponseSchema,
  requiresAuth: true,
  errorResponses: { 401: SmsLoginErrorSchema },
});

export const logoutApi = defineApiInfo({
  method: HttpMethodEnum.POST,
  path: '/api/sms-login/logout',
  summary: 'Delete the session from Redis',
  tags: ['SmsLogin'],
  requiresAuth: true,
  response: LogoutResponseSchema,
  errorResponses: { 401: SmsLoginErrorSchema },
});

export const sessionsApi = defineApiInfo({
  method: HttpMethodEnum.GET,
  path: '/api/sms-login/sessions',
  summary: 'List all live sessions stored in shared Redis',
  tags: ['SmsLogin'],
  response: SessionsResponseSchema,
});
