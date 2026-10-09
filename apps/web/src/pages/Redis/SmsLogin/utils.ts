import type { RedisOp } from './types';

const storagePrefix = 'sms-login:';

/** 构造某个客户端 token 在 localStorage 中的 key。 */
export const tokenKey = (label: string): string => `${storagePrefix}token:${label}`;
const cooldownKey = (label: string): string => `${storagePrefix}cooldown-end:${label}`;

/** 从 localStorage 读取已保存的 token，隐私模式下静默返回 null。 */
export const loadStoredToken = (label: string): string | null => {
  try {
    return localStorage.getItem(tokenKey(label));
  } catch {
    return null;
  }
};

/** 写入或清除 localStorage 中的 token；传 null 表示退出登录。 */
export const persistToken = (label: string, token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(tokenKey(label), token);
    } else {
      localStorage.removeItem(tokenKey(label));
    }
  } catch {
    // 隐私模式下存储不可用，仅退化为纯内存态。
  }
};

/** 读取验证码冷却截止时间戳（毫秒），失败时返回 0。 */
export const loadCooldownEnd = (label: string): number => {
  try {
    return Number(localStorage.getItem(cooldownKey(label)) ?? 0);
  } catch {
    return 0;
  }
};

let opSeq = 0;

/** 生成一条带自增 id 的 Redis 操作记录。 */
export const newOp = (op: string, key: string, note: string): RedisOp => {
  opSeq += 1;

  return { id: opSeq, op, key, note };
};
