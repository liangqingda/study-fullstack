import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Group, Text, TextInput, Title } from '@mantine/core';
import { IconBrandGoogle, IconLogin, IconRefresh, IconX } from '@tabler/icons-react';

import type { MeResponse, SendCodeResponse, SessionsResponse } from '@liangqingda/study-nodejs-schema';

import type { DemoStructure } from '@/components/DemoStructureDialog';
import {
  getApiSmsLoginMe,
  getApiSmsLoginSessions,
  postApiSmsLoginLogin,
  postApiSmsLoginLogout,
  postApiSmsLoginSendCode,
} from '@/apis';
import DemoStructureDialog from '@/components/DemoStructureDialog';
import { isAxiosError } from '@/utils/http';

import styles from './index.scss';

type RedisOp = { id: number; op: string; key: string; note: string };

const storagePrefix = 'sms-login:';
const tokenKey = (label: string): string => `${storagePrefix}token:${label}`;
const cooldownKey = (label: string): string => `${storagePrefix}cooldown-end:${label}`;

const loadStoredToken = (label: string): string | null => {
  try {
    return localStorage.getItem(tokenKey(label));
  } catch {
    return null;
  }
};

const persistToken = (label: string, token: string | null): void => {
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

const loadCooldownEnd = (label: string): number => {
  try {
    return Number(localStorage.getItem(cooldownKey(label)) ?? 0);
  } catch {
    return 0;
  }
};

let opSeq = 0;

const newOp = (op: string, key: string, note: string): RedisOp => {
  opSeq += 1;

  return { id: opSeq, op, key, note };
};

const structure: DemoStructure = {
  frontend: [
    { path: 'apps/web/src/pages/Redis/SmsLogin/index.tsx', role: '双客户端登录、共享会话视图与 Redis 操作日志。' },
    { path: 'apps/web/src/pages/Redis/SmsLogin/index.scss', role: '工作台与响应式布局。' },
    { path: 'apps/web/src/apis/index.ts', role: '从 OpenAPI 生成的调用方法，含 Bearer 头。' },
    { path: 'apps/web/src/utils/http/index.ts', role: 'axios 请求实例。' },
  ],
  backend: [
    { path: 'apps/api/src/services/app.ts', role: '挂载短信登录 Router。' },
    { path: 'apps/api/src/services/redis.ts', role: '创建 ioredis 客户端。' },
    { path: 'apps/api/src/express/sms-login/index.ts', role: '验证码、限频、会话建立与共享视图的全部 Redis 操作。' },
  ],
  schema: [
    { path: 'packages/schema/apis/sms-login/index.ts', role: '发码、登录、校验、退出与会话列表契约。' },
    { path: 'packages/schema/apis/model/api-info.ts', role: '接口描述的数据结构。' },
  ],
  connection: '页面调用 POST send-code/login/logout、GET me/sessions；后端按共享契约校验，用 ioredis 读写同一份 Redis，会话集中存储、多端可见。',
  database: '不使用 PostgreSQL。验证码与会话全部存于 Redis：sms:code:{phone}（EX 60s）、sms:send:{phone}（限频 NX+EX）、session:{token}（EX 30min，访问时滑动续期）。',
};

type ClientPanelProps = {
  label: string;
  accent: string;
  onLoginStateChange: () => void;
};

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
      localStorage.removeItem(cooldownKey(label));
    } catch {
      // 忽略。
    }
  }, [clearCooldownTimer, label]);

  const startCooldown = useCallback((seconds: number) => {
    cooldownEndRef.current = Date.now() + seconds * 1000;

    try {
      localStorage.setItem(cooldownKey(label), String(cooldownEndRef.current));
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

const CodeValue = ({ children }: { children: React.ReactNode }) => <code className={styles.codeValue}>{children}</code>;

const RedisExplainer = () => (
  <section className={styles.explainer}>
    <Title order={3} size="h5">本案例用到的 Redis 原语</Title>
    <div className={styles.primitiveGrid}>
      <div><Badge color="teal" variant="light">SET … EX</Badge><p>验证码与会话都带有效期写入，过期自动清理。</p></div>
      <div><Badge color="teal" variant="light">SET … NX</Badge><p>仅当键不存在才写入，用于 60s 内限频，防止刷验证码。</p></div>
      <div><Badge color="teal" variant="light">GET / DEL</Badge><p>校验验证码后立即删除，保证一次性；登出删除会话。</p></div>
      <div><Badge color="teal" variant="light">EXPIRE</Badge><p>每次访问会话都续期，实现滑动过期，活跃用户不掉线。</p></div>
      <div><Badge color="teal" variant="light">SCAN</Badge><p>遍历 session:* 展示所有在线会话——证明它们是集中式共享状态。</p></div>
    </div>
    <Text c="dimmed" size="sm">
      为什么“共享 session”用 Redis？因为会话存在 Redis 这一份集中数据里，多个后端实例指向同一个 Redis 都能校验同一 token，
      而不是各自进程内的内存 Session。页面右侧的视图就是这份共享状态，任何登录终端都能看到全部在线会话。
    </Text>
  </section>
);

const SmsLogin = () => {
  const [sessions, setSessions] = useState<SessionsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(0);

  const refreshSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getApiSmsLoginSessions();

      setSessions(response.data);
    } catch (cause) {
      const data = isAxiosError<{ error: string }>(cause) ? cause.response?.data : undefined;

      setError(data?.error ?? '获取共享会话失败；请确认后端与 Redis 已启动。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><Text c="teal" fw={700} size="sm">REDIS / SMS LOGIN</Text><Title order={1}>短信登录 · Redis 共享 Session</Title><Text c="dimmed">验证码限频、会话建续、集中式共享会话，全部由 Redis 承载。</Text></div>
          <Group gap="sm"><Badge color="teal" variant="light">5 个接口</Badge><DemoStructureDialog structure={structure} /></Group>
        </header>

        <div className={styles.workspace}>
          <div className={styles.clients}>
            <ClientPanel accent="blue" label="A" onLoginStateChange={() => setDirty((value) => value + 1)} />
            <ClientPanel accent="grape" label="B" onLoginStateChange={() => setDirty((value) => value + 1)} />
          </div>

          <section className={styles.registry}>
            <div className={styles.registryHeading}>
              <div><Title order={2}>共享 Session 视图</Title><Text c="dimmed" size="sm">GET /api/sms-login/sessions · 集中存储在 Redis</Text></div>
              <Button leftSection={<IconRefresh size={16} />} loading={loading} onClick={() => void refreshSessions()} variant="default">刷新（dirty={dirty}）</Button>
            </div>
            {error && <Text c="red" role="alert" size="sm">{error}</Text>}
            {!sessions && !error && <Text c="dimmed" size="sm">点击“刷新”查看当前 Redis 中所有在线会话。</Text>}
            {sessions && (
              <>
                <Text c="dimmed" size="sm">在线会话 {sessions.count} 个（客户端 A/B 登录后都应出现在这里，登出则消失）。</Text>
                <table className={styles.table}>
                  <thead><tr><th>手机号</th><th>会话 Token</th><th>剩余 TTL</th></tr></thead>
                  <tbody>
                    {sessions.sessions.length === 0 && <tr><td className={styles.emptyRow} colSpan={3}>暂无在线会话</td></tr>}
                    {sessions.sessions.map((session) => (
                      <tr key={session.token}><td>{session.phone}</td><td><CodeValue>{session.token.slice(0, 12)}…</CodeValue></td><td>{session.remainingSeconds}s</td></tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        </div>

        <RedisExplainer />
      </div>
    </main>
  );
};

export default SmsLogin;
