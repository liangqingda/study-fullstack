// start of generated types
/**
 * 发送验证码的请求体，仅携带手机号
 */
export type SendCodeRequest = {
  phone: string;
};

/**
 * 发送验证码的响应，回传验证码便于教学观察
 */
export type SendCodeResponse = {
  phone: string;
  /** 6 位数字验证码（演示环境后端回传以便观察；生产环境只应通过短信下发） */
  code: string;
  /** 验证码有效期，单位秒 */
  ttlSeconds: number;
};

/**
 * 发送验证码被限流的响应
 */
export type SendCodeRateLimited = {
  /** 错误信息 */
  error: string;
  /** 距下次可发送的等待秒数 */
  retryAfterSeconds: number;
};

/**
 * 登录请求体，携带手机号与验证码
 */
export type LoginRequest = {
  phone: string;
  /** 6 位数字验证码 */
  code: string;
};

/**
 * 登录成功的响应，返回会话令牌及有效期
 */
export type LoginResponse = {
  /** 会话令牌 */
  token: string;
  phone: string;
  /** 令牌有效期，单位秒 */
  expiresInSeconds: number;
};

/**
 * 查询当前会话的响应，返回令牌与剩余有效期
 */
export type MeResponse = {
  phone: string;
  /** 会话令牌 */
  token: string;
  /** 剩余有效期，单位秒 */
  remainingSeconds: number;
  /** 本次请求是否续期了 TTL（滑动过期） */
  refreshed: boolean;
};

/**
 * 登出成功的响应
 */
export type LogoutResponse = {
  /** 是否成功删除会话 */
  ok: boolean;
};

/**
 * 单个在线会话的摘要
 */
export type SessionEntry = {
  phone: string;
  /** 会话令牌 */
  token: string;
  /** 剩余有效期，单位秒 */
  remainingSeconds: number;
};

/**
 * 列出所有在线会话的响应
 */
export type SessionsResponse = {
  /** 在线会话数量 */
  count: number;
  sessions: SessionEntry[];
};

/**
 * 短信登录的通用错误响应
 */
export type SmsLoginError = {
  /** 错误信息 */
  error: string;
};
