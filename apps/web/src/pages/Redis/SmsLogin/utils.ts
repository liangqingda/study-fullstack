import type { RedisOp } from './types';

const storagePrefix = 'sms-login:';

export const tokenKey = (label: string): string => `${storagePrefix}token:${label}`;
const cooldownKey = (label: string): string => `${storagePrefix}cooldown-end:${label}`;

export const loadStoredToken = (label: string): string | null => {
  try {
    return localStorage.getItem(tokenKey(label));
  } catch {
    return null;
  }
};

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

export const loadCooldownEnd = (label: string): number => {
  try {
    return Number(localStorage.getItem(cooldownKey(label)) ?? 0);
  } catch {
    return 0;
  }
};

let opSeq = 0;

export const newOp = (op: string, key: string, note: string): RedisOp => {
  opSeq += 1;

  return { id: opSeq, op, key, note };
};
