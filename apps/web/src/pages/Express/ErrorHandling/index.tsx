import { useState } from 'react';
import { Badge, Button, Code, Text, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { Example, Result } from './types';

import DemoEmpty from '@/components/DemoEmpty';
import CodeBlock from '@/components/CodeBlock';
import DemoNavDetail from '@/components/DemoNavDetail';
import DemoSteps from '@/components/DemoSteps';
import { useDemoRequest } from '@/hooks/useDemoRequest';
import DemoLayout from '@/layouts/DemoLayout';

import { EXAMPLES, KNOWLEDGE, STRUCTURE } from './constants';

import styles from './index.scss';

const ErrorHandling = () => {
  const [selected, setSelected] = useState<Example>(EXAMPLES[0]);
  const { result, error, loading, reset, run } = useDemoRequest<Result>();
  const url = `/api/error-handling/${selected.slug}`;

  const select = (example: Example) => {
    setSelected(example);
    reset();
  };

  const sendRequest = () => {
    void run(async (signal) => {
      // 5s 超时：用一个内部 controller 触发 abort，并据此区分“超时”与“主动取消/切换”。
      const timeout = new AbortController();
      const onOuterAbort = () => timeout.abort();

      signal.addEventListener('abort', onOuterAbort, { once: true });
      const timeoutId = window.setTimeout(() => timeout.abort(), 5000);

      try {
        const response = await fetch(url, { signal: timeout.signal });
        const body = await response.text();

        return {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type') ?? '无',
          demoHeader: response.headers.get('x-demo-error') ?? '无',
          body,
        };
      } catch (cause) {
        if (timeout.signal.aborted && !signal.aborted) {
          throw new Error(selected.slug === 'headers-sent'
            ? '响应未完整结束（连接中断或代理仍在等待），无法读取完整响应。查看后端终端的 headersSent 和连接关闭日志。'
            : '请求失败或超时。请检查 localhost:3000 后端是否已启动。');
        }

        throw cause;
      } finally {
        window.clearTimeout(timeoutId);
        signal.removeEventListener('abort', onOuterAbort);
      }
    });
  };

  return (
    <DemoLayout
      description="从错误产生、进入错误处理链，到最终响应或连接中断，逐步对照每条路径。"
      knowledge={KNOWLEDGE}
      structure={STRUCTURE}
      title="错误处理"
    >
      <DemoNavDetail
        detailAriaLabel="示例详情"
        items={EXAMPLES.map((example) => ({ key: example.slug, title: example.title, subtitle: example.subtitle }))}
        navAriaLabel="错误处理示例"
        onSelect={(key) => {
          const example = EXAMPLES.find((item) => item.slug === key);

          if (example) { select(example); }
        }}
        selectedKey={selected.slug}
      >
            <div className={styles.detailHeading}>
              <div><Title order={2}>{selected.title}</Title><Text c="dimmed" size="sm">{selected.purpose}</Text></div>
              <Badge color="green" variant="dot">GET</Badge>
            </div>
            <section className={styles.lesson}>
              <h3>这次请求会怎样走</h3>
              <DemoSteps steps={selected.steps} />
              <div className={styles.notes}>
                <div><h3>关键代码</h3><CodeBlock code={selected.code} language="typescript" /></div>
                <div><h3>发送后应看到</h3><Text size="sm">{selected.observation}</Text></div>
              </div>
              <div className={styles.comparison}>
                <h3>和相近做法有什么不同</h3>
                <Text size="sm">{selected.comparison}</Text>
              </div>
            </section>
            <div className={styles.action}>
              <Code>{url}</Code>
              <Button leftSection={<IconPlayerPlay size={16} />} loading={loading} onClick={() => void sendRequest()}>发送请求</Button>
            </div>

            {error && (
              <div className={styles.failure} role="alert">
                <h3>实际结果：没有完整响应</h3>
                <Text size="sm">{error}</Text>
                <h3>为什么会这样</h3>
                <Text size="sm">{selected.slug === 'headers-sent' ? selected.interpretation : '没有收到可供分析的响应；先检查后端是否运行，再重试。'}</Text>
              </div>
            )}
            {!error && !result && <DemoEmpty>{loading ? '请求中…' : '等待请求'}</DemoEmpty>}
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
                <CodeBlock code={result.body || '响应体为空'} />
              </div>
            )}
          </DemoNavDetail>
    </DemoLayout>
  );
};

export default ErrorHandling;
