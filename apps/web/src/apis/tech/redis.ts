/* eslint-disable */
// Generated from @study-lab/schema. Do not edit.
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  SendCodeRequest,
  SendCodeResponse,
  SessionsResponse,
} from '@study-lab/schema';
import { get, post } from '@/utils/http';

export const postApiRedisSmsLoginLogin = (input: {
  body: LoginRequest;
  signal?: AbortSignal;
}) =>
  post<LoginResponse>('/api/tech/redis/sms-login/login', input.body, {
    signal: input.signal,
  });

export const postApiRedisSmsLoginLogout = (
  input: { headers?: { authorization?: string }; signal?: AbortSignal } = {},
) =>
  post<LogoutResponse>('/api/tech/redis/sms-login/logout', {
    headers: input.headers,
    signal: input.signal,
  });

export const getApiRedisSmsLoginMe = (
  input: { headers?: { authorization?: string }; signal?: AbortSignal } = {},
) =>
  get<MeResponse>('/api/tech/redis/sms-login/me', {
    headers: input.headers,
    signal: input.signal,
  });

export const postApiRedisSmsLoginSendCode = (input: {
  body: SendCodeRequest;
  signal?: AbortSignal;
}) =>
  post<SendCodeResponse>('/api/tech/redis/sms-login/send-code', input.body, {
    signal: input.signal,
  });

export const getApiRedisSmsLoginSessions = (
  input: { signal?: AbortSignal } = {},
) =>
  get<SessionsResponse>('/api/tech/redis/sms-login/sessions', {
    signal: input.signal,
  });
