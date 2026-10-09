import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Code, Group, Text, Textarea, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { DemoStructure } from '@/components/DemoStructureDialog';
import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import styles from './index.scss';

const structure: DemoStructure = {
  frontend: [
    { path: 'apps/web/src/pages/Express/Middleware/index.tsx', role: '五类中间件的讲解、请求操作和执行链展示。' },
    { path: 'apps/web/src/pages/Express/Middleware/index.scss', role: '页面布局与结果样式。' },
  ],
  backend: [
    { path: 'apps/api/src/services/app.ts', role: '将应用级中间件和 Router 挂载到 /api/middleware，并配置通用请求处理。' },
    { path: 'apps/api/src/express/middleware/index.ts', role: '实现应用级、路由级、错误处理、内置和第三方中间件示例；记录执行链及终端日志。' },
  ],
  connection: '页面向 /api/middleware/{示例名} 发送 GET 或 POST；app.ts 先经过 applicationMiddleware，再由对应路由处理。后端返回的 trace 在页面按顺序展示。',
  database: '无。五个请求只使用请求体与 res.locals，不查询或修改数据库。',
};

const knowledge = `## 中间件是什么

中间件是挂在“请求 → 响应”链路上的处理函数。请求按挂载顺序依次经过它们，每个中间件可以读请求、写响应，或把控制权交给下一步（\`next()\`）。

## 五种中间件怎么分

| 类型 | 关键特征 | 本例 |
| --- | --- | --- |
| 应用级 | 挂在 \`app\` 上，前缀匹配整个子树 | \`app.use('/api/middleware', ...)\` |
| 路由级 | 挂在某个 \`Router\` 上，可限定路径 | \`router.use('/router', ...)\` |
| 错误处理 | 四个参数，接收 \`next(error)\` | \`router.use((err, req, res, next) => ...)\` |
| 内置 | Express 自带 | \`express.json()\` 解析请求体 |
| 第三方 | 来自独立 npm 包 | \`morgan\` 记录 HTTP 日志 |

## 三个核心概念

1. **挂载顺序决定执行顺序**：中间件按注册先后进入链；\`next()\` 放行到下一步，不调用则请求停在当前层。
2. **\`next()\` 与 \`next(error)\` 的区别**：
   - \`next()\` → 继续正常链，进入下一个普通处理器。
   - \`next(error)\` → 跳过后续普通处理器，切换到错误处理链。
3. **错误处理中间件必须四个参数**，否则不会被识别为错误处理器；普通三参数中间件接不到 \`next(error)\`。

## trace 数组在证明什么

后端把每一步按真实执行先后写进 \`res.locals.trace\`，页面按顺序展示。它是**后端执行链的直接证据**，不是前端猜的——例如第一条永远是 \`app.use\`，说明应用级中间件先于 Router 内的处理器运行。

## 边界与误区

- \`express.json()\` 是读取请求体的**中间件**；\`res.json()\` 是写响应的方法，两者不是一回事。
- 第三方中间件只是来源不同，不代表固定在某时机运行；\`morgan\` 的 \`immediate: true\` 就让它跑在响应之前。
- 路由级与应用级函数签名相同，差别在于挂载位置和匹配范围。
`;

type Example = {
  key: string;
  name: string;
  summary: string;
  explanation: string;
  steps: string[];
  code: string;
  observation: string;
  interpretation: string;
  comparison: string;
  method: 'GET' | 'POST';
};

type DemoResponse = {
  kind: string;
  trace: string[];
  message?: string;
  received?: unknown;
};

const examples: Example[] = [
  {
    key: 'application', name: '应用级中间件', summary: '挂载在 app 上',
    explanation: 'app.use 挂载在 /api/middleware，五个示例都会先经过它。与路由级不同，它不属于某个 Router。',
    steps: [
      '请求匹配 /api/middleware，先进入 app.use 上的 applicationMiddleware；它把第一步写进 res.locals.trace。',
      '中间件调用 next()，控制权才会传给 Router；/application 的路由处理器补记一步并返回 JSON。',
      '响应完成后，后端终端的 finish 日志会输出同一条执行链和 HTTP 状态。',
    ],
    code: "app.use('/api/middleware', applicationMiddleware, router);\n// middleware: trace.push('app.use'); next();",
    observation: 'HTTP 200；trace 的第一步是 app.use，第二步是 app 路由处理器。其他四个请求也都以 app.use 开始。',
    interpretation: 'trace 是后端按执行先后写入的数组，不是前端推测的顺序；它证明挂载在应用上的中间件先于 Router 内的处理器运行。',
    comparison: 'app.use 的路径前缀覆盖整个 /api/middleware 子树；router.use 只属于某个 Router，还可进一步限制为 /router。', method: 'GET',
  },
  {
    key: 'router', name: '路由级中间件', summary: '挂载在 Router 上',
    explanation: 'router.use 仅对 /router 路径生效；同一个 Router 下的其他路径不会经过它。',
    steps: [
      '请求先经过应用级 applicationMiddleware，留下 app.use 记录。',
      'Router 内的 router.use("/router", ...) 匹配该路径，记录 router.use 并调用 next()。',
      'router.get("/router") 最后记录并发送响应；切换到 /application 时，路径不匹配，这一步便消失。',
    ],
    code: "router.use('/router', (req, res, next) => {\n  trace.push('router.use'); next();\n});",
    observation: 'HTTP 200，trace 依次显示 app.use、router.use、router.get 三步。',
    interpretation: '中间的 router.use 仅在路径匹配时出现；next() 使请求继续进入最终的 router.get，否则这次请求不会到达该处理器。',
    comparison: '路由级与应用级的函数签名相同，区别在于挂载位置和匹配范围，并不是两种不同的 next()。', method: 'GET',
  },
  {
    key: 'error', name: '错误处理中间件', summary: '接住 next(error)',
    explanation: '四参数处理器接收 next(error) 传来的错误，负责统一返回状态与消息；普通中间件不会接收这个错误。',
    steps: [
      '应用级中间件先记录 app.use；/error 路由再记录 next(error)，并把 Error 传出去。',
      'Express 跳过后续普通处理器，找到 Router 末尾的四参数错误处理中间件。',
      '它追加错误处理记录，使用 res.status(500).json(...) 结束响应，因此默认错误页不会接手。',
    ],
    code: "router.get('/error', (req, res, next) => next(new Error('演示用错误')));\nrouter.use((error, req, res, next) => res.status(500).json(...));",
    observation: 'HTTP 500，trace 从路由直接进入错误处理器；响应体包含 message，没有正常成功响应。',
    interpretation: '500 和 JSON 是本例的自定义错误处理中间件写出的；next(error) 只是转交错误，本身不会写响应。',
    comparison: 'next() 表示继续正常链；next(error) 切换到错误链。详细的默认处理器及已发送响应头场景可在“错误处理”页对照。', method: 'GET',
  },
  {
    key: 'built-in', name: '内置中间件', summary: 'express.json() 解析请求体',
    explanation: 'Express 内置的 express.json() 将 JSON 请求体解析到 req.body；格式错误则交由错误处理中间件返回 400。',
    steps: [
      'POST 请求先经过应用级中间件，再进入该路由专用的 express.json()。请求头 Content-Type: application/json 告诉它按 JSON 解析。',
      '合法 JSON 被解析为 req.body，路由把 received 原样放进响应；修改输入可观察值如何变化。',
      '无效 JSON 会让解析器调用错误链，跳过成功路由，错误处理器返回 400 和“JSON 格式错误”。',
    ],
    code: "router.post('/built-in', express.json(), (req, res) => {\n  res.json({ received: req.body });\n});",
    observation: '合法输入得到 HTTP 200，received 与输入对象一致；输入 {bad} 再请求，会得到 HTTP 400 且没有 received。',
    interpretation: '200 时 trace 中有 express.json 解析成功的记录；400 时没有这一步成功记录，只有错误处理器，因为解析在进入路由前就失败了。',
    comparison: 'express.json() 是内置的请求体解析中间件，不是响应方法 res.json()；前者读取请求，后者把数据写成响应。', method: 'POST',
  },
  {
    key: 'third-party', name: '第三方中间件', summary: 'morgan 记录 HTTP 日志',
    explanation: 'morgan 来自独立 npm 包，作为中间件插入请求链；本例设置 immediate 使日志在路由响应前写入后端终端。',
    steps: [
      '应用级中间件先记录 app.use；Router 中仅匹配 /third-party 的 morgan 接着执行。',
      'morgan 的格式函数写入 trace 并向后端终端打印请求方法、路径；immediate 让这一步在发送响应前发生。',
      '随后路由处理器记录 router.get 并返回 JSON，响应结束后应用级 finish 日志再打印整条 trace。',
    ],
    code: "router.use('/third-party', morgan(format, { immediate: true }));\nrouter.get('/third-party', handler);",
    observation: 'HTTP 200，trace 中 morgan 位于 app.use 与 router.get 之间；后端终端还有一条 middleware demo GET /third-party 日志。',
    interpretation: 'morgan 是第三方包，但仍遵守 Express 中间件的进入与继续规则；它负责记录请求，真正的 JSON 响应由后续路由写出。',
    comparison: '第三方中间件只是来源不同，不表示一定在请求前或响应后运行；时机取决于挂载顺序和配置。本例的 immediate 特意选择响应前。', method: 'GET',
  },
];

const basePath = '/api/middleware';

const Middleware = () => {
  const [selected, setSelected] = useState(examples[0]);
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
      const response = await fetch(`${basePath}/${selected.key}`, {
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
            <DemoStructureDialog structure={structure} />
            <DemoKnowledgeDialog content={knowledge} demoName="五类中间件" />
          </Group>
        </header>
        <div className={styles.workspace}>
          <nav aria-label="中间件类型" className={styles.navigation}>
            {examples.map((example) => (
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
              <Code>{selected.method} {basePath}/{selected.key}</Code>
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
