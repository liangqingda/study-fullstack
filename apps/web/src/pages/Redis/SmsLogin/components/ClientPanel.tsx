import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Text, TextInput } from '@mantine/core';
import { IconBrandGoogle, IconLogin, IconRefresh, IconX } from '@tabler/icons-react';

import type { ReactNode } from 'react';
import type { MeResponse, SendCodeResponse } from '@liangqingda/study-nodejs-schema';
import type { ClientPanelProps, RedisOp } from '../types';

import {
  getApiSmsLoginMe,
  postApiSmsLoginLogin,
  postApiSmsLoginLogout,
  postApiSmsLoginSendCode,
} from '@/apis';
import { isAxiosError } from '@/utils/http';

import { loadCooldownEnd, loadStoredToken, newOp, persistToken } from '../utils';

import styles from '../index.scss';

const CodeValue = ({ children }: { children: ReactNode }) => <code className={styles.codeValue}>{children}</code>;

const ClientPanel = ({ label, accent, onLoginStateChange }: ClientPanelProps) => {
  const [phone, setPhone] = useState('13800138000');
  const [codeInput, setCodeInput] = useState('');
  const [sent, setSent] = useState<SendCodeResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ops, setOps] = useState<RedisOp[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [cooldown, setCooldown] = useState(() => {
    const end = loadCooldownEnd(label);

    return end > Date.now() ? Math.round((end - Date.now()) / 1000) : 0;
  });
  const cooldownEndRef = useRef<number>(loadCooldownEnd(label));
  const timerRef = useRef<number | null>(null);
  const [meRemaining, setMeRemaining] = useState(0);
  const meExpiresAtRef = useRef(0);
  const meTimerRef = useRef<number | null>(null);

  const clearMeTimer = useCallback(() => {
    if (meTimerRef.current !== null) {
      window.clearInterval(meTimerRef.current);
      meTimerRef.current = null;
    }
  }, []);

  const startMeCountdown = useCallback((seconds: number) => {
    meExpiresAtRef.current = Date.now() + seconds * 1000;
    setMeRemaining(seconds);
    clearMeTimer();
    meTimerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((meExpiresAtRef.current - Date.now()) / 1000));

      setMeRemaining(remaining);

      if (remaining <= 0) {
        clearMeTimer();
        persistToken(label, null);
        setToken(null);
        setMe(null);
      }
    }, 1000);
  }, [clearMeTimer, label]);

  const clearCooldownTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopCooldown = useCallback(() => {
    clearCooldownTimer();

    try {
      localStorage.removeItem(`sms-login:cooldown-end:${label}`);
    } catch {
      // 忽略。
    }
  }, [clearCooldownTimer, label]);

  const startCooldown = useCallback((seconds: number) => {
    cooldownEndRef.current = Date.now() + seconds * 1000;

    try {
      localStorage.setItem(`sms-login:cooldown-end:${label}`, String(cooldownEndRef.current));
    } catch {
      // 忽略存储失败，倒计时退化为纯内存态。
    }

    setCooldown(seconds);
    clearCooldownTimer();
    timerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((cooldownEndRef.current - Date.now()) / 1000));

      setCooldown(remaining);

      if (remaining <= 0) {
        stopCooldown();
      }
    }, 1000);
  }, [clearCooldownTimer, stopCooldown, label]);

  useEffect(() => {
    // 刷新后恢复发码倒计时：后端限频在 60s 内仍会拒绝，界面保持一致。
    const savedEnd = loadCooldownEnd(label);

    if (savedEnd > Date.now()) {
      cooldownEndRef.current = savedEnd;
      timerRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.round((cooldownEndRef.current - Date.now()) / 1000));

        setCooldown(remaining);

        if (remaining <= 0) {
          stopCooldown();
        }
      }, 1000);
    }

    // 刷新后恢复登录态：从 localStorage 读 token，再用 /me 校验（会话在 Redis 中仍有效则自动续期）。
    const storedToken = loadStoredToken(label);

    if (storedToken) {
      getApiSmsLoginMe({ headers: { authorization: `Bearer ${storedToken}` } })
        .then((response) => {
          setToken(storedToken);
          setMe(response.data);
          startMeCountdown(response.data.remainingSeconds);
        })
        .catch(() => {
          persistToken(label, null);
          setToken(null);
          setMe(null);
        });
    }

    return () => {
      clearCooldownTimer();
      clearMeTimer();
    };
  }, [clearCooldownTimer, stopCooldown, label, startMeCountdown, clearMeTimer]);

  const auth = token ? { headers: { authorization: `Bearer ${token}` } } : undefined;

  const sendCode = async () => {
    setBusy('send');
    setError('');

    try {
      const response = await postApiSmsLoginSendCode({ body: { phone } });

      setSent(response.data);
      startCooldown(response.data.ttlSeconds);
      setOps((current) => [
        newOp('SET', `sms:send:${phone}`, 'NX + EX 60s：限频标记'),
        newOp('SET', `sms:code:${phone}`, `EX ${response.data.ttlSeconds}s：写入验证码`),
        ...current,
      ].slice(0, 12));
    } catch (cause) {
      const data = isAxiosError<{ error: string; retryAfterSeconds?: number }>(cause) ? cause.response?.data : undefined;

      setError(data?.error ?? '发码失败；请确认后端与 Redis 已启动。');

      if (data?.retryAfterSeconds) {
        startCooldown(data.retryAfterSeconds);
      }
    } finally {
      setBusy('');
    }
  };

  const login = async () => {
    setBusy('login');
    setError('');

    try {
      const response = await postApiSmsLoginLogin({ body: { phone, code: codeInput } });

      persistToken(label, response.data.token);
      setToken(response.data.token);
      setMe({ phone, token: response.data.token, remainingSeconds: response.data.expiresInSeconds, refreshed: false });
      startMeCountdown(response.data.expiresInSeconds);
      setOps((current) => [
        newOp('GET', `sms:code:${phone}`, '比对验证码'),
        newOp('DEL', `sms:code:${phone}`, '一次性使用'),
        newOp('SET', `session:${token?.slice(0, 8)}…`, `EX ${response.data.expiresInSeconds}s：建立共享会话`),
        ...current,
      ].slice(0, 12));
      setSent(null);
      setCodeInput('');
      onLoginStateChange();
    } catch (cause) {
      const data = isAxiosError<{ error: string }>(cause) ? cause.response?.data : undefined;

      setError(data?.error ?? '登录失败；请确认后端与 Redis 已启动。');
    } finally {
      setBusy('');
    }
  };

  const refresh = async () => {
    setBusy('me');
    setError('');

    try {
      const response = await getApiSmsLoginMe(auth ?? { signal: undefined });

      setMe(response.data);
      startMeCountdown(response.data.remainingSeconds);
      setOps((current) => [
        newOp('GET', `session:${token?.slice(0, 8)}…`, '读取共享会话'),
        newOp('EXPIRE', `session:${token?.slice(0, 8)}…`, '滑动续期 30min'),
        ...current,
      ].slice(0, 12));
    } catch (cause) {
      const data = isAxiosError<{ error: string }>(cause) ? cause.response?.data : undefined;

      setError(data?.error ?? '会话校验失败。');
    } finally {
      setBusy('');
    }
  };

  const logout = async () => {
    setBusy('logout');
    setError('');

    try {
      const response = await postApiSmsLoginLogout(auth ?? { signal: undefined });

      setOps((current) => [newOp('DEL', `session:${token?.slice(0, 8)}…`, response.data.ok ? '会话已删除' : '会话不存在'), ...current].slice(0, 12));
      persistToken(label, null);
      clearMeTimer();
      setMeRemaining(0);
      setToken(null);
      setMe(null);
      onLoginStateChange();
    } catch (cause) {
      const data = isAxiosError<{ error: string }>(cause) ? cause.response?.data : undefined;

      setError(data?.error ?? '退出失败。');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className={styles.client}>
      <header className={styles.clientHeading}>
        <Text fw={700}>客户 {label}</Text>
        <Badge color={accent} variant="light">{token ? '已登录' : '未登录'}</Badge>
      </header>

      <div className={styles.row}>
        <TextInput aria-label={`客户${label} 手机号`} disabled={Boolean(token)} label="手机号" onChange={(event) => setPhone(event.currentTarget.value)} value={phone} />
        <Button disabled={Boolean(token) || cooldown > 0} leftSection={<IconBrandGoogle size={16} />} loading={busy === 'send'} onClick={() => void sendCode()} variant="default">{cooldown > 0 ? `${cooldown}s 后重试` : '发送验证码'}</Button>
      </div>

      {sent && (
        <Text c="green" size="sm">
          演示环境验证码：<CodeValue>{sent.code}</CodeValue>（{sent.ttlSeconds}s 有效）
        </Text>
      )}

      <div className={styles.row}>
        <TextInput aria-label={`客户${label} 验证码`} disabled={!sent || Boolean(token)} label="验证码" onChange={(event) => setCodeInput(event.currentTarget.value)} placeholder="6 位数字" value={codeInput} />
        <Button color={accent} disabled={!sent || !codeInput || Boolean(token)} leftSection={<IconLogin size={16} />} loading={busy === 'login'} onClick={() => void login()}>登录</Button>
      </div>

      {token && me && (
        <div className={styles.sessionBox}>
          <div><small>共享会话</small><CodeValue>{me.token.slice(0, 12)}…</CodeValue></div>
          <div><small>剩余 TTL</small><strong>{meRemaining}s</strong><small>（每秒递减 · 刷新 /me 续期）</small></div>
          <div className={styles.sessionActions}>
            <Button leftSection={<IconRefresh size={15} />} loading={busy === 'me'} onClick={() => void refresh()} size="xs" variant="default">刷新会话 /me</Button>
            <Button color="red" leftSection={<IconX size={15} />} loading={busy === 'logout'} onClick={() => void logout()} size="xs" variant="outline">退出</Button>
          </div>
        </div>
      )}

      {error && <Text c="red" role="alert" size="sm">{error}</Text>}

      {ops.length > 0 && (
        <ol className={styles.ops}>
          {ops.map((item) => (
            <li key={`${label}-${item.id}`}>
              <Badge color="gray" size="xs" variant="outline">{item.op}</Badge>
              <code>{item.key}</code>
              <span>{item.note}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default ClientPanel;
