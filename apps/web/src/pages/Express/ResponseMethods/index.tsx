import { useState } from 'react';
import { Badge, Button, Code, Group, Loader, Text, Title } from '@mantine/core';
import { IconDownload, IconExternalLink, IconPlayerPlay } from '@tabler/icons-react';

import DemoEmpty from '@/components/DemoEmpty';
import CodeBlock from '@/components/CodeBlock';
import DemoNavDetail from '@/components/DemoNavDetail';
import DemoSteps from '@/components/DemoSteps';
import DemoLayout from '@/layouts/DemoLayout';

import ResponseResult from './components/ResponseResult';
import { BASE_PATH, KNOWLEDGE, METHODS, STRUCTURE } from './constants';
import { useResponseRequest } from './hooks/useResponseRequest';
import { methodUrl } from './utils';

import styles from './index.scss';

const ResponseMethods = () => {
  const [selected, setSelected] = useState(METHODS[2]);
  const { result, error, loading, reset, run } = useResponseRequest();
  const url = methodUrl(selected.slug);

  return (
    <DemoLayout
      description="选择方法并发送请求，观察状态、响应头和响应体。"
      knowledge={KNOWLEDGE}
      structure={STRUCTURE}
      title="Response METHODS"
    >
      <DemoNavDetail
        detailAriaLabel="响应详情"
        items={METHODS.map((method) => ({
          key: method.slug,
          title: method.name,
          subtitle: method.description,
        }))}
        navAriaLabel="Response METHODS"
        onSelect={(key) => {
          const method = METHODS.find((item) => item.slug === key);

          if (method) {
            setSelected(method);
            reset();
          }
        }}
        selectedKey={selected.slug}
      >
        <div className={styles.detailHeading}>
          <div>
            <Title order={2}>{selected.name}</Title>
            <Text c="dimmed" size="sm">
              {selected.note} {selected.explanation}
            </Text>
          </div>
          <Badge color="green" variant="dot">
            GET
          </Badge>
        </div>

        <section className={styles.explanation}>
          <h3>这次请求会怎样走</h3>
          <DemoSteps steps={selected.steps} />
          <div className={styles.explanationGrid}>
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
                href={`${BASE_PATH}/${selected.slug}`}
                leftSection={
                  selected.slug === 'download' ? (
                    <IconDownload size={16} />
                  ) : (
                    <IconExternalLink size={16} />
                  )
                }
                rel="noreferrer"
                target="_blank"
                variant="default"
              >
                {selected.slug === 'download' ? '下载' : '打开跳转'}
              </Button>
            )}
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              loading={loading}
              onClick={() => void run(url)}
            >
              发送请求
            </Button>
          </Group>
        </div>

        {error && (
          <Text c="red" role="alert">
            {error}
          </Text>
        )}
        {!result && !error && <DemoEmpty>{loading ? <Loader size="sm" /> : '等待请求'}</DemoEmpty>}
        {result && (
          <ResponseResult
            interpretation={selected.interpretation}
            result={result}
            showPreview={selected.slug === 'render'}
          />
        )}
      </DemoNavDetail>
    </DemoLayout>
  );
};

export default ResponseMethods;
