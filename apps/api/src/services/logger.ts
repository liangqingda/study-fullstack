import pino from 'pino';

import type { Logger } from 'pino';
import type { Request } from 'express';

/**
 * 兜底 logger：业务路由优先使用 pino-http 挂载到 req.log 的（带脱敏配置的）
 * 请求级 logger；在未挂载 pino-http 的环境（如最小化测试夹具）下回退到本
 * 实例，避免路由因 req.log 缺失而抛空引用。warn 级别抑制测试噪音。
 */
export const baseLogger: Logger = pino({ level: 'warn' });

/**
 * 解析请求级 logger，缺失时回退到 {@link baseLogger}。
 *
 * @param req 当前 Express 请求对象。
 * @returns 可用的 pino Logger 实例。
 */
export const loggerFor = (req: Request): Logger =>
  (req as unknown as { log?: Logger }).log ?? baseLogger;
