import { useState } from 'react';
import { Badge, Button, Code, Text, Textarea, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { DemoResponse, Example } from './types';

import DemoEmpty from '@/components/DemoEmpty';
import CodeBlock from '@/components/CodeBlock';
import DemoNavDetail from '@/components/DemoNavDetail';
import DemoSteps from '@/components/DemoSteps';
import { useDemoRequest } from '@/hooks/useDemoRequest';
import DemoLayout from '@/layouts/DemoLayout';

import { BASE_PATH, EXAMPLES, KNOWLEDGE, STRUCTURE } from './constants';

import styles from './index.scss';

const Middleware = () => {
  const [selected, setSelected] = useState<Example>(EXAMPLES[0]);
  const [body, setBody] = useState('{"topic":"Express","count":2}');
  const { result, error, loading, reset, run } = useDemoRequest<{
    status: number;
    data: DemoResponse;
  }>();

  const select = (example: Example) => {
    setSelected(example);
    reset();
  };

  const sendRequest = () => {
    void run(async (signal) => {
      try {
        const response = await fetch(`${BASE_PATH}/${selected.key}`, {
          method: selected.method,
          signal,
          ...(selected.method === 'POST'
            ? { headers: { 'Content-Type': 'application/json' }, body }
            : {}),
        });
        const data = (await response.json()) as DemoResponse;

        return { status: response.status, data };
      } catch (cause) {
        if (signal.aborted) {
          throw cause;
        }

        throw new Error('请求失败，请确认后端已在 localhost:3000 启动。');
      }
    });
  };

  return (
    <DemoLayout
      description="发送真实请求，对照中间件的执行链和响应。"
      knowledge={KNOWLEDGE}
      structure={STRUCTURE}
      title="五类中间件"
    >
      <DemoNavDetail
        detailAriaLabel="中间件示例"
        items={EXAMPLES.map((example) => ({
          key: example.key,
          title: example.name,
          subtitle: example.summary,
        }))}
        navAriaLabel="中间件类型"
        onSelect={(key) => {
          const example = EXAMPLES.find((item) => item.key === key);

          if (example) {
            select(example);
          }
        }}
        selectedKey={selected.key}
      >
        <div className={styles.detailHeading}>
          <div>
            <Title order={2}>{selected.name}</Title>
            <Text c="dimmed" size="sm">
              {selected.explanation}
            </Text>
          </div>
          <Badge color={selected.method === 'POST' ? 'orange' : 'teal'} variant="light">
            {selected.method}
          </Badge>
        </div>
        <section className={styles.lesson}>
          <h3>这次请求会怎样走</h3>
          <DemoSteps steps={selected.steps} />
          <div className={styles.notes}>
            <div>
              <h3>关键代码</h3>
              <CodeBlock code={selected.code} language="typescript" />
            </div>
            <div>
              <h3>发送后应看到</h3>
              <Text size="sm">{selected.observation}</Text>
            </div>
          </div>
          <div className={styles.comparison}>
            <h3>和相近做法有什么不同</h3>
            <Text size="sm">{selected.comparison}</Text>
          </div>
        </section>
        {selected.method === 'POST' && (
          <Textarea
            label="JSON 请求体"
            minRows={3}
            onChange={(event) => setBody(event.currentTarget.value)}
            value={body}
          />
        )}
        <div className={styles.action}>
          <Code>
            {selected.method} {BASE_PATH}/{selected.key}
          </Code>
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            loading={loading}
            onClick={() => void sendRequest()}
          >
            发送请求
          </Button>
        </div>
        {error && (
          <Text c="red" role="alert">
            {error}
          </Text>
        )}
        {!result && !error && <DemoEmpty>{loading ? '请求中…' : '等待请求'}</DemoEmpty>}
        {result && (
          <div aria-live="polite" className={styles.result}>
            <div className={styles.resultHeading}>
              <h3>实际结果</h3>
              <Badge color={result.status >= 400 ? 'red' : 'teal'} variant="light">
                HTTP {result.status}
              </Badge>
            </div>
            <h3>执行顺序</h3>
            <ol className={styles.trace}>
              {result.data.trace.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className={styles.interpretation}>
              <h3>为什么得到这个结果</h3>
              <Text size="sm">{selected.interpretation}</Text>
            </div>
            <h3>响应体</h3>
            <CodeBlock code={JSON.stringify(result.data, null, 2)} language="json" />
          </div>
        )}
      </DemoNavDetail>
    </DemoLayout>
  );
};

export default Middleware;
