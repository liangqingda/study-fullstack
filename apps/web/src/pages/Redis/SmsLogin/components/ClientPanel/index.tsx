import { useEffect, useState } from 'react';
import { Badge, Button, Text, TextInput } from '@mantine/core';
import {
  IconBrandGoogle,
  IconLogin,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';

import type {
  MeResponse,
  SendCodeResponse,
} from '@liangqingda/study-nodejs-schema';
import type { ClientPanelProps, RedisOp } from '../../types';

import {
  getApiSmsLoginMe,
  postApiSmsLoginLogin,
  postApiSmsLoginLogout,
  postApiSmsLoginSendCode,
} from '@/apis';
import { useCountdown } from '@/hooks/useCountdown';
import { bearerAuth, isApiError } from '@/utils/http';

import { loadStoredToken, newOp, persistToken } from '../../utils';
import CodeValue from './CodeValue';

import styles from './index.scss';

const ClientPanel = ({
  label,
  accent,
  onLoginStateChange,
}: ClientPanelProps) => {
  const [phone, setPhone] = useState('13800138000');
  const [codeInput, setCodeInput] = useState('');
  const [sent, setSent] = useState<SendCodeResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ops, setOps] = useState<RedisOp[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  // 发码冷却倒计时：localStorage 持久化，刷新后由 hook 恢复（后端限频在 60s 内仍会拒绝）。
  const cooldown = useCountdown({
    persistKey: `sms-login:cooldown-end:${label}`,
  });
  // 共享会话 TTL 倒计时：归零时清登录态。
  const ttl = useCountdown({
    onFinish: () => {
      persistToken(label, null);
      setToken(null);
      setMe(null);
    },
  });
  // 解构出稳定引用，供 effect / 事件处理器使用（避免依赖整个 ttl 对象）。
  const startTtl = ttl.start;
  const resetTtl = ttl.reset;

  useEffect(() => {
    // 刷新后恢复登录态：从 localStorage 读 token，再用 /me 校验（会话在 Redis 中仍有效则自动续期）。
    const storedToken = loadStoredToken(label);

    if (storedToken) {
      getApiSmsLoginMe({ headers: bearerAuth(storedToken) })
        .then((response) => {
          setToken(storedToken);
          setMe(response.data);
          startTtl(response.data.remainingSeconds);
        })
        .catch(() => {
          persistToken(label, null);
          setToken(null);
          setMe(null);
        });
    }
  }, [label, startTtl]);

  const auth = bearerAuth(token);

  const sendCode = async () => {
    setBusy('send');
    setError('');

    try {
      const response = await postApiSmsLoginSendCode({ body: { phone } });

      setSent(response.data);
      cooldown.start(response.data.ttlSeconds);
      setOps((current) =>
        [
          newOp('SET', `sms:send:${phone}`, 'NX + EX 60s：限频标记'),
          newOp(
            'SET',
            `sms:code:${phone}`,
            `EX ${response.data.ttlSeconds}s：写入验证码`,
          ),
          ...current,
        ].slice(0, 12),
      );
    } catch (cause) {
      const apiError = isApiError(cause) ? cause : null;

      setError(apiError?.message ?? '发码失败；请确认后端与 Redis 已启动。');

      if (apiError?.data?.retryAfterSeconds) {
        cooldown.start(apiError.data.retryAfterSeconds);
      }
    } finally {
      setBusy('');
    }
  };

  const login = async () => {
    setBusy('login');
    setError('');

    try {
      const response = await postApiSmsLoginLogin({
        body: { phone, code: codeInput },
      });

      persistToken(label, response.data.token);
      setToken(response.data.token);
      setMe({
        phone,
        token: response.data.token,
        remainingSeconds: response.data.expiresInSeconds,
        refreshed: false,
      });
      startTtl(response.data.expiresInSeconds);
      setOps((current) =>
        [
          newOp('GET', `sms:code:${phone}`, '比对验证码'),
          newOp('DEL', `sms:code:${phone}`, '一次性使用'),
          newOp(
            'SET',
            `session:${token?.slice(0, 8)}…`,
            `EX ${response.data.expiresInSeconds}s：建立共享会话`,
          ),
          ...current,
        ].slice(0, 12),
      );
      setSent(null);
      setCodeInput('');
      onLoginStateChange();
    } catch (cause) {
      setError(
        isApiError(cause)
          ? cause.message
          : '登录失败；请确认后端与 Redis 已启动。',
      );
    } finally {
      setBusy('');
    }
  };

  const refresh = async () => {
    setBusy('me');
    setError('');

    try {
      const response = await getApiSmsLoginMe({ headers: auth });

      setMe(response.data);
      startTtl(response.data.remainingSeconds);
      setOps((current) =>
        [
          newOp('GET', `session:${token?.slice(0, 8)}…`, '读取共享会话'),
          newOp('EXPIRE', `session:${token?.slice(0, 8)}…`, '滑动续期 30min'),
          ...current,
        ].slice(0, 12),
      );
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : '会话校验失败。');
    } finally {
      setBusy('');
    }
  };

  const logout = async () => {
    setBusy('logout');
    setError('');

    try {
      const response = await postApiSmsLoginLogout({ headers: auth });

      setOps((current) =>
        [
          newOp(
            'DEL',
            `session:${token?.slice(0, 8)}…`,
            response.data.ok ? '会话已删除' : '会话不存在',
          ),
          ...current,
        ].slice(0, 12),
      );
      persistToken(label, null);
      resetTtl();
      setToken(null);
      setMe(null);
      onLoginStateChange();
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : '退出失败。');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className={styles.client}>
      <header className={styles.clientHeading}>
        <Text fw={700}>客户 {label}</Text>
        <Badge color={accent} variant="light">
          {token ? '已登录' : '未登录'}
        </Badge>
      </header>

      <div className={styles.row}>
        <TextInput
          aria-label={`客户${label} 手机号`}
          disabled={Boolean(token)}
          label="手机号"
          onChange={(event) => setPhone(event.currentTarget.value)}
          value={phone}
        />
        <Button
          disabled={Boolean(token) || cooldown.remaining > 0}
          leftSection={<IconBrandGoogle size={16} />}
          loading={busy === 'send'}
          onClick={() => void sendCode()}
          variant="default"
        >
          {cooldown.remaining > 0
            ? `${cooldown.remaining}s 后重试`
            : '发送验证码'}
        </Button>
      </div>

      {sent && (
        <Text c="green" size="sm">
          演示环境验证码：<CodeValue>{sent.code}</CodeValue>（{sent.ttlSeconds}s
          有效）
        </Text>
      )}

      <div className={styles.row}>
        <TextInput
          aria-label={`客户${label} 验证码`}
          disabled={!sent || Boolean(token)}
          label="验证码"
          onChange={(event) => setCodeInput(event.currentTarget.value)}
          placeholder="6 位数字"
          value={codeInput}
        />
        <Button
          color={accent}
          disabled={!sent || !codeInput || Boolean(token)}
          leftSection={<IconLogin size={16} />}
          loading={busy === 'login'}
          onClick={() => void login()}
        >
          登录
        </Button>
      </div>

      {token && me && (
        <div className={styles.sessionBox}>
          <div>
            <small>共享会话</small>
            <CodeValue>{me.token.slice(0, 12)}…</CodeValue>
          </div>
          <div>
            <small>剩余 TTL</small>
            <strong>{ttl.remaining}s</strong>
            <small>（每秒递减 · 刷新 /me 续期）</small>
          </div>
          <div className={styles.sessionActions}>
            <Button
              leftSection={<IconRefresh size={15} />}
              loading={busy === 'me'}
              onClick={() => void refresh()}
              size="xs"
              variant="default"
            >
              刷新会话 /me
            </Button>
            <Button
              color="red"
              leftSection={<IconX size={15} />}
              loading={busy === 'logout'}
              onClick={() => void logout()}
              size="xs"
              variant="outline"
            >
              退出
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Text c="red" role="alert" size="sm">
          {error}
        </Text>
      )}

      {ops.length > 0 && (
        <ol className={styles.ops}>
          {ops.map((item) => (
            <li key={`${label}-${item.id}`}>
              <Badge color="gray" size="xs" variant="outline">
                {item.op}
              </Badge>
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
