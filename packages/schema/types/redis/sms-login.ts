// start of generated types
export type SendCodeRequest = {
  phone: string;
};

export type SendCodeResponse = {
  phone: string;
  code: string;
  ttlSeconds: number;
};

export type SendCodeRateLimited = {
  error: string;
  retryAfterSeconds: number;
};

export type LoginRequest = {
  phone: string;
  code: string;
};

export type LoginResponse = {
  token: string;
  phone: string;
  expiresInSeconds: number;
};

export type MeResponse = {
  phone: string;
  token: string;
  remainingSeconds: number;
  refreshed: boolean;
};

export type LogoutResponse = {
  ok: boolean;
};

export type SessionEntry = {
  phone: string;
  token: string;
  remainingSeconds: number;
};

export type SessionsResponse = {
  count: number;
  sessions: SessionEntry[];
};

export type SmsLoginError = {
  error: string;
};
