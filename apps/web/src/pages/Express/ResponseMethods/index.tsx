import { useState } from 'react';
import { Badge, Button, Code, Group, Loader, Text, Title } from '@mantine/core';
import { IconDownload, IconExternalLink, IconPlayerPlay } from '@tabler/icons-react';

import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import ResponseResult from './components/ResponseResult';
import { basePath, knowledge, methods, structure } from './constants';
import { useResponseRequest } from './hooks/useResponseRequest';
import { methodUrl } from './utils';

import styles from './index.scss';

const ResponseMethods = () => {
  const [selected, setSelected] = useState(methods[2]);
  const { result, error, loading, reset, run } = useResponseRequest();
  const url = methodUrl(selected.slug);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Title order={1}>Response methods</Title>
            <Text c="dimmed">选择方法并发送请求，观察状态、响应头和响应体。</Text>
          </div>
          <Group gap="sm" justify="flex-end">
            <DemoStructureDialog structure={structure} />
            <DemoKnowledgeDialog content={knowledge} demoName="Response methods" />
          </Group>
        </header>

        <div className={styles.workspace}>
          <nav aria-label="Response methods" className={styles.methodList}>
            {methods.map((method) => (
              <button
                aria-current={selected.slug === method.slug ? 'true' : undefined}
                className={`${styles.methodItem} ${selected.slug === method.slug ? styles.active : ''}`}
                key={method.slug}
                onClick={() => {
                  setSelected(method);
                  reset();
                }}
                type="button"
              >
                <strong>{method.name}</strong>
                <span>{method.description}</span>
              </button>
            ))}
          </nav>

          <section aria-label="响应详情" className={styles.detail}>
            <div className={styles.detailHeading}>
              <div>
                <Title order={2}>{selected.name}</Title>
                <Text c="dimmed" size="sm">{selected.note} {selected.explanation}</Text>
              </div>
              <Badge color="green" variant="dot">GET</Badge>
            </div>

            <section className={styles.explanation}>
              <h3>这次请求会怎样走</h3>
              <ol className={styles.steps}>{selected.steps.map((step) => <li key={step}>{step}</li>)}</ol>
              <div className={styles.explanationGrid}>
                <div><h3>关键代码</h3><pre className={styles.exampleCode}>{selected.code}</pre></div>
                <div><h3>发送后应看到</h3><Text size="sm">{selected.observation}</Text></div>
              </div>
              <div className={styles.comparison}>
                <h3>和相近方法有什么不同</h3>
                <Text size="sm">{selected.comparison}</Text>
              </div>
            </section>

            <div className={styles.requestBar}>
              <Code className={styles.url}>{url}</Code>
              <Group gap="xs" wrap="nowrap">
                {(selected.slug === 'download' || selected.slug === 'redirect') && (
                  <Button
                    component="a"
                    href={`${basePath}/${selected.slug}`}
                    leftSection={selected.slug === 'download' ? <IconDownload size={16} /> : <IconExternalLink size={16} />}
                    rel="noreferrer"
                    target="_blank"
                    variant="default"
                  >
                    {selected.slug === 'download' ? '下载' : '打开跳转'}
                  </Button>
                )}
                <Button leftSection={<IconPlayerPlay size={16} />} loading={loading} onClick={() => void run(url)}>
                  发送请求
                </Button>
              </Group>
            </div>

            {error && <Text c="red" role="alert">{error}</Text>}
            {!result && !error && <div className={styles.empty}>{loading ? <Loader size="sm" /> : '等待请求'}</div>}
            {result && <ResponseResult interpretation={selected.interpretation} result={result} showPreview={selected.slug === 'render'} />}
          </section>
        </div>
      </div>
    </main>
  );
};

export default ResponseMethods;
