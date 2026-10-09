import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Code, Group, Text, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { Example, Result } from './types';

import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import { EXAMPLES, KNOWLEDGE, STRUCTURE } from './constants';

import styles from './index.scss';

const ErrorHandling = () => {
  const [selected, setSelected] = useState<Example>(EXAMPLES[0]);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState('');
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const url = `/api/error-handling/${selected.slug}`;

  useEffect(() => () => controllerRef.current?.abort(), []);

  const select = (example: Example) => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setSelected(example);
    setResult(null);
    setFailure('');
    setLoading(false);
  };

  const run = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    controllerRef.current = controller;
    setFailure('');
    setLoading(true);

    try {
      const response = await fetch(url, { signal: controller.signal });
      const body = await response.text();

      if (controllerRef.current !== controller) {
        return;
      }

      setResult({
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type') ?? '无',
        demoHeader: response.headers.get('x-demo-error') ?? '无',
        body,
      });
    } catch {
      if (controllerRef.current === controller) {
        setResult(null);
        setFailure(selected.slug === 'headers-sent'
          ? '响应未完整结束（连接中断或代理仍在等待），无法读取完整响应。查看后端终端的 headersSent 和连接关闭日志。'
          : '请求失败或超时。请检查 localhost:3000 后端是否已启动。');
      }
    } finally {
      window.clearTimeout(timeoutId);

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
            <Title order={1}>错误处理</Title>
            <Text c="dimmed">从错误产生、进入错误处理链，到最终响应或连接中断，逐步对照每条路径。</Text>
          </div>
          <Group gap="sm" justify="flex-end">
            <DemoStructureDialog structure={STRUCTURE} />
            <DemoKnowledgeDialog content={KNOWLEDGE} demoName="错误处理" />
          </Group>
        </header>

        <div className={styles.workspace}>
          <nav aria-label="错误处理示例" className={styles.navigation}>
            {EXAMPLES.map((example) => (
              <button
                aria-current={selected.slug === example.slug ? 'true' : undefined}
                className={`${styles.navItem} ${selected.slug === example.slug ? styles.active : ''}`}
                key={example.slug}
                onClick={() => select(example)}
                type="button"
              >
                <strong>{example.title}</strong><span>{example.subtitle}</span>
              </button>
            ))}
          </nav>

          <section aria-label="示例详情" className={styles.detail}>
            <div className={styles.detailHeading}>
              <div><Title order={2}>{selected.title}</Title><Text c="dimmed" size="sm">{selected.purpose}</Text></div>
              <Badge color="green" variant="dot">GET</Badge>
            </div>
            <section className={styles.lesson}>
              <h3>这次请求会怎样走</h3>
              <ol className={styles.steps}>
                {selected.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <div className={styles.notes}>
                <div><h3>关键代码</h3><pre>{selected.code}</pre></div>
                <div><h3>发送后应看到</h3><Text size="sm">{selected.observation}</Text></div>
              </div>
              <div className={styles.comparison}>
                <h3>和相近做法有什么不同</h3>
                <Text size="sm">{selected.comparison}</Text>
              </div>
            </section>
            <div className={styles.action}>
              <Code>{url}</Code>
              <Button leftSection={<IconPlayerPlay size={16} />} loading={loading} onClick={() => void run()}>发送请求</Button>
            </div>

            {failure && (
              <div className={styles.failure} role="alert">
                <h3>实际结果：没有完整响应</h3>
                <Text size="sm">{failure}</Text>
                <h3>为什么会这样</h3>
                <Text size="sm">{selected.slug === 'headers-sent' ? selected.interpretation : '没有收到可供分析的响应；先检查后端是否运行，再重试。'}</Text>
              </div>
            )}
            {!failure && !result && <div className={styles.empty}>{loading ? '请求中…' : '等待请求'}</div>}
            {result && (
              <div className={styles.result}>
                <div className={styles.resultHeading}>
                  <h3>实际响应</h3><Badge color="red" variant="light">HTTP {result.status} {result.statusText}</Badge>
                </div>
                <dl className={styles.headers}>
                  <dt>Content-Type</dt><dd>{result.contentType}</dd>
                  <dt>X-Demo-Error</dt><dd>{result.demoHeader}</dd>
                </dl>
                <div className={styles.interpretation}>
                  <h3>为什么得到这个结果</h3>
                  <Text size="sm">{selected.interpretation}</Text>
                </div>
                <h3>响应体（原始文本）</h3>
                <pre>{result.body || '响应体为空'}</pre>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default ErrorHandling;
