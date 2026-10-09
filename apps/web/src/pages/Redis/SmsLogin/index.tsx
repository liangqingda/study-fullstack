import { useState } from 'react';
import { Button, Group, Text, Title } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';

import type { SessionsResponse } from '@liangqingda/study-nodejs-schema';

import { getApiSmsLoginSessions } from '@/apis';
import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';
import { isAxiosError } from '@/utils/http';

import ClientPanel from './components/ClientPanel';
import RedisExplainer from './components/RedisExplainer';
import { knowledge, structure } from './constants';

import styles from './index.scss';

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
          <div><Title order={1}>短信登录 · Redis 共享 Session</Title><Text c="dimmed">验证码限频、会话建续、集中式共享会话，全部由 Redis 承载。</Text></div>
          <Group gap="sm"><DemoStructureDialog structure={structure} /><DemoKnowledgeDialog content={knowledge} demoName="短信登录 · Redis 共享 Session" /></Group>
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
            {!sessions && !error && <Text c="dimmed" size="sm">点击&ldquo;刷新&rdquo;查看当前 Redis 中所有在线会话。</Text>}
            {sessions && (
              <>
                <Text c="dimmed" size="sm">在线会话 {sessions.count} 个（客户端 A/B 登录后都应出现在这里，登出则消失）。</Text>
                <table className={styles.table}>
                  <thead><tr><th>手机号</th><th>会话 Token</th><th>剩余 TTL</th></tr></thead>
                  <tbody>
                    {sessions.sessions.length === 0 && <tr><td className={styles.emptyRow} colSpan={3}>暂无在线会话</td></tr>}
                    {sessions.sessions.map((session) => (
                      <tr key={session.token}><td>{session.phone}</td><td><code className={styles.codeValue}>{session.token.slice(0, 12)}…</code></td><td>{session.remainingSeconds}s</td></tr>
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
