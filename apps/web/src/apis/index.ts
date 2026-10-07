/* eslint-disable */
// Generated from study-nodejs-schema. Do not edit.
import type { AxiosResponse } from 'axios';
import type { LoginRequest, LoginResponse, LogoutResponse, MeResponse, SendCodeRequest, SendCodeResponse, SessionsResponse, TransactionRunRequest, TransactionRunResponse } from '@liangqingda/study-nodejs-schema';
import { request } from '@/utils/http';

export const postApiSmsLoginLogin = (input: { body: LoginRequest; signal?: AbortSignal }): Promise<AxiosResponse<LoginResponse>> =>
  request<LoginResponse>({ method: "POST", url: "/api/sms-login/login", data: input.body, signal: input.signal });

export const postApiSmsLoginLogout = (input: { headers?: { authorization?: string }; signal?: AbortSignal } = {}): Promise<AxiosResponse<LogoutResponse>> =>
  request<LogoutResponse>({ method: "POST", url: "/api/sms-login/logout", headers: input.headers, signal: input.signal });

export const getApiSmsLoginMe = (input: { headers?: { authorization?: string }; signal?: AbortSignal } = {}): Promise<AxiosResponse<MeResponse>> =>
  request<MeResponse>({ method: "GET", url: "/api/sms-login/me", headers: input.headers, signal: input.signal });

export const postApiSmsLoginSendCode = (input: { body: SendCodeRequest; signal?: AbortSignal }): Promise<AxiosResponse<SendCodeResponse>> =>
  request<SendCodeResponse>({ method: "POST", url: "/api/sms-login/send-code", data: input.body, signal: input.signal });

export const getApiSmsLoginSessions = (input: { signal?: AbortSignal } = {}): Promise<AxiosResponse<SessionsResponse>> =>
  request<SessionsResponse>({ method: "GET", url: "/api/sms-login/sessions", signal: input.signal });

export const postApiTransactionsRun = (input: { body: TransactionRunRequest; signal?: AbortSignal }): Promise<AxiosResponse<TransactionRunResponse>> =>
  request<TransactionRunResponse>({ method: "POST", url: "/api/transactions/run", data: input.body, signal: input.signal });
