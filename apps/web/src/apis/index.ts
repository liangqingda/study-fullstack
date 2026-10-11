/* eslint-disable */
// Generated from study-nodejs-schema. Do not edit.
import type { AxiosResponse } from 'axios';
import type { LoginRequest, LoginResponse, LogoutResponse, MeResponse, SendCodeRequest, SendCodeResponse, SessionsResponse, TransactionRunRequest, TransactionRunResponse } from '@liangqingda/study-nodejs-schema';
import { get, post } from '@/utils/http';

export const postApiSmsLoginLogin = (input: { body: LoginRequest; signal?: AbortSignal }): Promise<AxiosResponse<LoginResponse>> =>
  post<LoginResponse>("/api/sms-login/login", input.body, { signal: input.signal });

export const postApiSmsLoginLogout = (input: { headers?: { authorization?: string }; signal?: AbortSignal } = {}): Promise<AxiosResponse<LogoutResponse>> =>
  post<LogoutResponse>("/api/sms-login/logout", { headers: input.headers, signal: input.signal });

export const getApiSmsLoginMe = (input: { headers?: { authorization?: string }; signal?: AbortSignal } = {}): Promise<AxiosResponse<MeResponse>> =>
  get<MeResponse>("/api/sms-login/me", { headers: input.headers, signal: input.signal });

export const postApiSmsLoginSendCode = (input: { body: SendCodeRequest; signal?: AbortSignal }): Promise<AxiosResponse<SendCodeResponse>> =>
  post<SendCodeResponse>("/api/sms-login/send-code", input.body, { signal: input.signal });

export const getApiSmsLoginSessions = (input: { signal?: AbortSignal } = {}): Promise<AxiosResponse<SessionsResponse>> =>
  get<SessionsResponse>("/api/sms-login/sessions", { signal: input.signal });

export const postApiTransactionsRun = (input: { body: TransactionRunRequest; signal?: AbortSignal }): Promise<AxiosResponse<TransactionRunResponse>> =>
  post<TransactionRunResponse>("/api/transactions/run", input.body, { signal: input.signal });
