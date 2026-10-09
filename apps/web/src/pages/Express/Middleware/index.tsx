import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Code, Group, Text, Textarea, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { DemoResponse, Example } from './types';

import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import { BASE_PATH, EXAMPLES, KNOWLEDGE, STRUCTURE } from './constants';

import styles from './index.scss';

const Middleware = () => {
  const [selected, setSelected] = useState<Example>(EXAMPLES[0]);
  const [body, setBody] = useState('{"topic":"Express","count":2}');
  const [result, setResult] = useState<{ status: number; data: DemoResponse } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const select = (example: Example) => {
    controllerRef.current?.abort();
    controllerRef.current = null;

    setSelected(example);
    setResult(null);
    setError('');
    setLoading(false);
  };

  const run = async () => {
    controllerRef.current?.abort();

    const controller = new AbortController();

    controllerRef.current = controller;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BASE_PATH}/${selected.key}`, {
        method: selected.method,
        signal: controller.signal,
        ...(selected.method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body } : {}),
      });
      const data = await response.json() as DemoResponse;

      if (controllerRef.current === controller) {
        setResult({ status: response.status, data });
      }
    } catch {
      if (controllerRef.current === controller && !controller.signal.aborted) {
        setResult(null);
        setError('请求失败，请确认后端已在 localhost:3000 启动。');
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Title order={1}>五类中间件</Title>
            <Text c="dimmed">发送真实请求，对照中间件的执行链和响应。</Text>
          </div>
          <Group gap="sm" justify="flex-end">
            <DemoStructureDialog structure={STRUCTURE} />
            <DemoKnowledgeDialog content={KNOWLEDGE} demoName="五类中间件" />
          </Group>
        </header>
        <div className={styles.workspace}>
          <nav aria-label="中间件类型" className={styles.navigation}>
            {EXAMPLES.map((example) => (
              <button
                aria-current={selected.key === example.key ? 'true' : undefined}
                className={`${styles.navItem} ${selected.key === example.key ? styles.active : ''}`}
                key={example.key}
                onClick={() => select(example)}
                type="button"
              >
                <strong>{example.name}</strong><span>{example.summary}</span>
              </button>
            ))}
          </nav>
          <section aria-label="中间件示例" className={styles.detail}>
            <div className={styles.detailHeading}>
              <div><Title order={2}>{selected.name}</Title><Text c="dimmed" size="sm">{selected.explanation}</Text></div>
              <Badge color={selected.method === 'POST' ? 'orange' : 'teal'} variant="light">{selected.method}</Badge>
            </div>
            <section className={styles.lesson}>
              <h3>这次请求会怎样走</h3>
              <ol className={styles.steps}>{selected.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              <div className={styles.notes}>
                <div><h3>关键代码</h3><pre>{selected.code}</pre></div>
                <div><h3>发送后应看到</h3><Text size="sm">{selected.observation}</Text></div>
              </div>
              <div className={styles.comparison}>
                <h3>和相近做法有什么不同</h3>
                <Text size="sm">{selected.comparison}</Text>
              </div>
            </section>
            {selected.method === 'POST' && (
              <Textarea label="JSON 请求体" minRows={3} onChange={(event) => setBody(event.currentTarget.value)} value={body} />
            )}
            <div className={styles.action}>
              <Code>{selected.method} {BASE_PATH}/{selected.key}</Code>
              <Button leftSection={<IconPlayerPlay size={16} />} loading={loading} onClick={() => void run()}>发送请求</Button>
            </div>
            {error && <Text c="red" role="alert">{error}</Text>}
            {!result && !error && <div className={styles.empty}>{loading ? '请求中…' : '等待请求'}</div>}
            {result && (
              <div aria-live="polite" className={styles.result}>
                <div className={styles.resultHeading}><h3>实际结果</h3><Badge color={result.status >= 400 ? 'red' : 'teal'} variant="light">HTTP {result.status}</Badge></div>
                <h3>执行顺序</h3>
                <ol className={styles.trace}>{result.data.trace.map((step) => <li key={step}>{step}</li>)}</ol>
                <div className={styles.interpretation}>
                  <h3>为什么得到这个结果</h3>
                  <Text size="sm">{selected.interpretation}</Text>
                </div>
                <h3>响应体</h3><pre>{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Middleware;
