/* eslint-disable */
// Generated from study-nodejs-schema. Do not edit.
import type { LoginRequest, LoginResponse, LogoutResponse, MeResponse, SendCodeRequest, SendCodeResponse, SessionsResponse } from '@liangqingda/study-nodejs-schema';
import { get, post } from '@/utils/http';

export const postApiSmsLoginLogin = (input: { body: LoginRequest; signal?: AbortSignal }) =>
  post<LoginResponse>("/api/sms-login/login", input.body, { signal: input.signal });

export const postApiSmsLoginLogout = (input: { headers?: { authorization?: string }; signal?: AbortSignal } = {}) =>
  post<LogoutResponse>("/api/sms-login/logout", { headers: input.headers, signal: input.signal });

export const getApiSmsLoginMe = (input: { headers?: { authorization?: string }; signal?: AbortSignal } = {}) =>
  get<MeResponse>("/api/sms-login/me", { headers: input.headers, signal: input.signal });

export const postApiSmsLoginSendCode = (input: { body: SendCodeRequest; signal?: AbortSignal }) =>
  post<SendCodeResponse>("/api/sms-login/send-code", input.body, { signal: input.signal });

export const getApiSmsLoginSessions = (input: { signal?: AbortSignal } = {}) =>
  get<SessionsResponse>("/api/sms-login/sessions", { signal: input.signal });
