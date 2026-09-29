import { useState } from 'react';
import { Badge, Button, Code, Group, Loader, Text, Title } from '@mantine/core';
import { IconDownload, IconExternalLink, IconPlayerPlay } from '@tabler/icons-react';

import type { DemoStructure } from '@/components/DemoStructureDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import ResponseResult from './components/ResponseResult';
import { useResponseRequest } from './hooks/useResponseRequest';
import { basePath, methodUrl, methods } from './utils/response-methods';

import styles from './index.scss';

const structure: DemoStructure = {
  frontend: [
    { path: 'src/pages/Express/ResponseMethods/index.tsx', role: '选择响应方法并触发请求，组织页面讲解。' },
    { path: 'src/pages/Express/ResponseMethods/hooks/useResponseRequest.ts', role: '发送请求并读取状态、响应头与响应体。' },
    { path: 'src/pages/Express/ResponseMethods/utils/response-methods.ts', role: '各方法的请求地址、预期结果和对比说明。' },
    { path: 'src/pages/Express/ResponseMethods/components/ResponseResult.tsx', role: '展示实际响应及对应解释。' },
    { path: 'src/pages/Express/ResponseMethods/index.scss', role: '页面与结果样式。' },
  ],
  backend: [
    { path: 'src/services/app.ts', role: '将示例 Router 挂载到 /api/response-methods。' },
    { path: 'src/express/response-methods/index.ts', role: '九种 res 响应方法的路由和终端日志。' },
    { path: 'src/express/response-methods/assets/response-demo.txt', role: 'download 与 sendFile 使用的示例文件。' },
    { path: 'src/express/response-methods/views/response-demo.ejs', role: 'render 方法使用的 EJS 模板。' },
  ],
  connection: '页面向 /api/response-methods/{方法名} 发送请求；对应路由选用 res 方法返回响应，Hook 读取实际响应，再由 ResponseResult 展示。下载和跳转也提供浏览器直接操作入口。',
  database: '无。响应内容来自路由数据、同目录的文本文件或 EJS 模板，不查询或修改数据库。',
};

const ResponseMethods = () => {
  const [selected, setSelected] = useState(methods[2]);
  const { result, error, loading, reset, run } = useResponseRequest();
  const url = methodUrl(selected.slug);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Text c="teal" fw={700} size="sm">EXPRESS / HTTP</Text>
            <Title order={1}>Response methods</Title>
            <Text c="dimmed">选择方法并发送请求，观察状态、响应头和响应体。</Text>
          </div>
          <Group gap="sm" justify="flex-end">
            <Badge color="teal" variant="light">{methods.length} methods</Badge>
            <DemoStructureDialog structure={structure} />
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
