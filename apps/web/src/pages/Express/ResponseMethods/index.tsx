import { useState } from 'react';
import { Badge, Button, Code, Group, Loader, Text, Title } from '@mantine/core';
import { IconDownload, IconExternalLink, IconPlayerPlay } from '@tabler/icons-react';

import type { DemoStructure } from '@/components/DemoStructureDialog';
import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import ResponseResult from './components/ResponseResult';
import { useResponseRequest } from './hooks/useResponseRequest';
import { basePath, methodUrl, methods } from './utils/response-methods';

import styles from './index.scss';

const structure: DemoStructure = {
  frontend: [
    { path: 'apps/web/src/pages/Express/ResponseMethods/index.tsx', role: '选择响应方法并触发请求，组织页面讲解。' },
    { path: 'apps/web/src/pages/Express/ResponseMethods/hooks/useResponseRequest.ts', role: '发送请求并读取状态、响应头与响应体。' },
    { path: 'apps/web/src/pages/Express/ResponseMethods/utils/response-methods.ts', role: '各方法的请求地址、预期结果和对比说明。' },
    { path: 'apps/web/src/pages/Express/ResponseMethods/components/ResponseResult.tsx', role: '展示实际响应及对应解释。' },
    { path: 'apps/web/src/pages/Express/ResponseMethods/index.scss', role: '页面与结果样式。' },
  ],
  backend: [
    { path: 'apps/api/src/services/app.ts', role: '将示例 Router 挂载到 /api/response-methods。' },
    { path: 'apps/api/src/express/response-methods/index.ts', role: '九种 res 响应方法的路由和终端日志。' },
    { path: 'apps/api/src/express/response-methods/assets/response-demo.txt', role: 'download 与 sendFile 使用的示例文件。' },
    { path: 'apps/api/src/express/response-methods/views/response-demo.ejs', role: 'render 方法使用的 EJS 模板。' },
  ],
  connection: '页面向 /api/response-methods/{方法名} 发送请求；对应路由选用 res 方法返回响应，Hook 读取实际响应，再由 ResponseResult 展示。下载和跳转也提供浏览器直接操作入口。',
  database: '无。响应内容来自路由数据、同目录的文本文件或 EJS 模板，不查询或修改数据库。',
};

const knowledge = `## res 方法在做什么

\`res.*\` 是 Express 用于**结束本次请求并写出响应**的方法。它们共同处理三件事：**状态码、响应头、响应体**。

## 方法速查

| 方法 | 返回内容 | 典型用途 |
| --- | --- | --- |
| \`res.json()\` | 序列化后的 JSON | API 返回结构化数据 |
| \`res.jsonp()\` | 包成函数调用的脚本 | 旧式跨域（教学） |
| \`res.send()\` | 字符串 / Buffer / 对象 | 通用发送 |
| \`res.sendStatus()\` | 状态文字 | 只给状态码 + 简短文字 |
| \`res.status(204).end()\` | 空 | 无内容响应 |
| \`res.download()\` | 文件 + attachment 头 | 提示浏览器下载 |
| \`res.sendFile()\` | 文件内容 | 直接展示文件 |
| \`res.render()\` | 模板渲染后的 HTML | 服务端渲染 |
| \`res.redirect()\` | 302 + Location | 跳转到别的地址 |

## 看结果时对照三样东西

1. **状态码**：204 / 302 / 418 是方法或显式设置的产物。
2. **Content-Type**：\`application/json\`、\`text/plain\`、\`text/html\` 决定客户端如何解释 Body。
3. **Body**：有没有内容、是纯文本还是 JSON 还是脚本。

## 几组易混的对比

- \`json()\` 自动声明 \`application/json\`；\`send()\` 更通用，本示例用 \`res.type('text/plain').send(...)\` 限定为纯文本。
- \`download()\` 与 \`sendFile()\` 发同一个文件，区别只在有没有 \`Content-Disposition: attachment\`。
- \`sendStatus(418)\` 会写状态文字；\`status(204).end()\` 不写 Body，\`end()\` 只是结束连接。
- \`redirect()\` 返回 302，fetch 会自动跟随到 \`json\`，所以你看到的 200 JSON 是**跳转目标**的响应，不是 302 本身。
- \`render()\` 是后端把数据填进模板再发 HTML，预览里的内容是服务器生成，不是前端拼出来的。

## 为什么 type 和状态值得关注

HTTP 的语义由状态码与响应头共同表达：\`text/plain\` 让浏览器当文字读，\`application/json\` 让客户端按数据解析。只看 Body 不够，要连 Content-Type 一起读。
`;

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
