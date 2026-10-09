import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Code, Group, Text, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { DemoStructure } from '@/components/DemoStructureDialog';
import DemoKnowledgeDialog from '@/components/DemoKnowledgeDialog';
import DemoStructureDialog from '@/components/DemoStructureDialog';

import styles from './index.scss';

const structure: DemoStructure = {
  frontend: [
    { path: 'apps/web/src/pages/Express/ErrorHandling/index.tsx', role: '六种错误路径的讲解、请求操作与状态码、响应头和响应体展示。' },
    { path: 'apps/web/src/pages/Express/ErrorHandling/index.scss', role: '错误结果、执行步骤和页面布局样式。' },
  ],
  backend: [
    { path: 'apps/api/src/services/app.ts', role: '将示例 Router 挂载到 /api/error-handling，并在路由之后挂载应用级错误处理器。' },
    { path: 'apps/api/src/express/error-handling/index.ts', role: '实现六条错误路由及四参数错误处理器，记录完成或连接关闭。' },
    { path: 'apps/api/src/middlewares/error-handler.ts', role: '处理示例 Router 继续转交的未发送响应错误；响应头已发送时再交给 Express 默认处理器。' },
  ],
  connection: '页面请求 /api/error-handling/{示例名}；路由触发错误后，示例处理器可直接返回 JSON，也可继续转交给应用级错误处理器。响应头已发送时继续进入 Express 默认处理器并关闭连接。',
  database: '无。错误由路由和文件读取模拟，不查询或修改数据库。',
};

const knowledge = `## 错误从哪里来

错误可以在三个不同时机产生，Express 接住它们的方式不同：

| 产生方式 | 进入错误链的方式 |
| --- | --- |
| 同步 \`throw\` | Express 自动捕获 |
| async 函数 \`await\` 到 rejected Promise | Express 5 自动转交 \`next(error)\` |
| Node 风格回调 | 需要在回调里手动 \`next(error)\` |

## 错误处理链怎么走

普通处理器只接收 \`(req, res, next)\`。**错误处理中间件有四个参数** \`(err, req, res, next)\`，并且要放在路由之后。请求触发错误后：

\`错误 → next(error) → 跳过普通处理器 → 四参数错误中间件 → 写响应或继续转交\`

## 谁能决定最终响应

- **默认处理器**（Express 内置）：根据 \`err.status\` 选状态码、用 \`err.headers\` 加响应头，返回 HTML（生产环境不暴露堆栈）。
- **自定义处理器**：自己 \`res.status(...).json(...)\` 结束请求，返回稳定的业务格式。

两者二选一；如果既不写响应也不 \`next(err)\`，请求会一直挂起。

## 两个关键元数据

- \`err.status\`：数字状态码（4xx / 5xx 才生效，其他按 500）。
- \`err.headers\`：附加到响应的额外响应头（如 \`X-Demo-Error\`）。

## headersSent：响应已经开始的情况

一旦 \`res.write(...)\` 发出了第一块内容，\`res.headersSent\` 变为 \`true\`，就**不能回头改成错误响应**。此时错误处理器只能 \`next(err)\`，由默认处理器关闭连接终止这条不完整的响应。先看到 200 不代表成功，因为 200 已随最初内容发出。

## 一个常见误区

不是所有回调里的错误都会被 Express 捕获。\`readFile\` 的回调不在路由的同步调用栈里，直接 \`throw\` 可能变成未捕获异常；必须在回调里 \`next(error)\` 才能交给 Express。
`;

type Example = {
  slug: string;
  title: string;
  subtitle: string;
  purpose: string;
  steps: string[];
  code: string;
  observation: string;
  interpretation: string;
  comparison: string;
};

type Result = {
  status: number;
  statusText: string;
  contentType: string;
  demoHeader: string;
  body: string;
};

const examples: Example[] = [
  {
    slug: 'sync', title: '同步抛错', subtitle: 'throw -> 默认处理器',
    purpose: '请求进入路由时直接抛出异常。这是最基本的错误入口：路由没有返回响应，Express 会接住错误并开始寻找错误处理器。',
    steps: [
      'GET /sync 进入路由；throw 立即中断当前处理函数，因此不会执行后续的成功响应代码。',
      'Express 捕获同步异常，跳过普通中间件，进入末尾的四参数错误中间件。',
      '本例的错误中间件对 /sync 调用 next(error)，所以最终由 Express 内置的默认错误处理器生成响应。',
    ],
    code: "router.get('/sync', () => {\n  throw new Error('同步路由中的演示错误');\n});",
    observation: '状态 500、Content-Type 为 text/html。开发环境的 HTML 包含错误消息和调用栈；NODE_ENV=production 时只返回状态说明，不暴露栈。',
    interpretation: '500 是因为 Error 没有指定有效的 err.status；HTML 而非 JSON 说明最终响应来自默认处理器。堆栈只适合开发调试，不应作为业务接口格式。',
    comparison: '同步路由里的 throw 会被 Express 捕获；定时器或文件回调里稍后抛出的错误不在这次同步调用栈内，需要在回调里捕获并调用 next(error)。',
  },
  {
    slug: 'async', title: '异步拒绝', subtitle: 'Promise -> 默认处理器',
    purpose: '路由需要 await 异步操作，而该操作失败。观察 Express 5 对返回的 Promise 如何自动接力。',
    steps: [
      'GET /async 调用 async 路由；await 遇到被拒绝的 Promise，路由返回的 Promise 也随之拒绝。',
      'Express 5 观察这个返回值，自动把拒绝原因传给 next(error)，从而进入错误处理链。',
      '自定义错误中间件继续传递，默认处理器生成 500 HTML；路由不必再写 try/catch 来重复转交。',
    ],
    code: "router.get('/async', async () => {\n  await Promise.reject(new Error('异步路由中的演示错误'));\n});",
    observation: '和同步抛错一样得到 500 HTML，但错误最初来自 Promise 拒绝。',
    interpretation: '响应格式和状态与同步场景相同，说明两种错误最终到达同一个默认处理器；区别在于错误进入处理链的方式。',
    comparison: '这是 Express 5 对“路由返回的 Promise”的自动处理，不等于任意回调中的错误也会自动被捕获。不要同时自动拒绝又手动 next(error)，避免重复转交。',
  },
  {
    slug: 'callback', title: '回调中的错误', subtitle: 'next(error) -> 默认处理器',
    purpose: '读取一个不存在的文件，演示 Node 风格回调在路由函数返回之后才报告错误的情况。',
    steps: [
      'GET /callback 发起 readFile；路由函数先返回，此时文件读取还没有完成。',
      '操作系统报告文件不存在，回调收到带 ENOENT 代码的错误；回调调用 next(error)。',
      'Express 才得以跳过普通处理器，依次交给本例的错误中间件和默认错误处理器。',
    ],
    code: "readFile('/express-error-handling-demo-missing-file', (error) => {\n  if (error) next(error);\n});",
    observation: '状态 500；开发环境的响应体中可见 ENOENT（文件不存在），终端可见回调转交错误的日志。',
    interpretation: 'ENOENT 是文件系统错误码；这里没有把它映射成业务状态，所以默认处理器返回 500，而不是把“文件不存在”自动变成 HTTP 404。',
    comparison: '与 async/await 返回 Promise 不同，readFile 的回调不是路由返回的 Promise。直接在回调里 throw 可能成为未捕获异常；在回调里调用 next(error) 才能交给 Express。',
  },
  {
    slug: 'status', title: '状态与响应头', subtitle: 'next(error) -> 默认处理器',
    purpose: '错误不一定只能返回 500。为错误对象附加 HTTP 状态和响应头，观察默认处理器如何使用它们。',
    steps: [
      'GET /status 创建 Error，并设置 status=422、headers.X-Demo-Error=validation。',
      'next(error) 跳过普通处理器；本例的错误中间件继续 next(error)，没有自己写响应。',
      '默认处理器从 err.status 选择 422，并把 err.headers 加到响应中，再生成 HTML 错误页。',
    ],
    code: "const error = Object.assign(new Error('无效的演示输入'), {\n  status: 422, headers: { 'X-Demo-Error': 'validation' },\n});\nnext(error);",
    observation: '状态 422、X-Demo-Error: validation，响应体仍是默认处理器的 HTML；页面将状态和响应头分开显示。',
    interpretation: '422 来自 err.status，响应头来自 err.headers；默认处理器只接受 4xx/5xx 错误状态，其他值会按 500 处理。错误消息本身不会自动决定 HTTP 状态。',
    comparison: '与自定义处理器不同，这里没有调用 res.status(...).send(...)；我们只提供错误元数据，实际写响应的仍是 Express 内置处理器。',
  },
  {
    slug: 'custom', title: '自定义处理器', subtitle: '四参数中间件 -> JSON',
    purpose: '接口希望返回稳定的 JSON，而不是默认 HTML 或开发栈信息。由应用自己的错误处理中间件负责结束请求。',
    steps: [
      'GET /custom 调用 next(new Error(...))，Express 跳过普通中间件，进入路由后面的四参数错误中间件。',
      '处理器识别 /custom，用 res.status(500).json(...) 写入对客户端友好的消息并结束响应。',
      '因为已经响应且没有再调用 next(error)，默认处理器不会执行；其他场景则会继续交给它。',
    ],
    code: "router.use((err, req, res, next) => {\n  if (req.path === '/custom') {\n    res.status(500).json({ handler: 'custom', message: '服务器出错' });\n    return;\n  }\n  next(err);\n});",
    observation: '状态 500、Content-Type 为 application/json；响应体有 handler 和 message，没有内部错误堆栈。',
    interpretation: 'JSON 是 res.json(...) 写出的，不是 Express 默认处理器的格式。客户端可依赖这个响应结构；错误详情应留在服务端日志而非响应体中。',
    comparison: '错误中间件必须有四个参数并放在路由之后；普通三参数中间件接不到 next(error)。若错误处理器既不响应也不 next，请求会挂起。',
  },
  {
    slug: 'headers-sent', title: '响应已开始', subtitle: 'headersSent -> 连接关闭',
    purpose: '模拟流式响应已经写出一部分后才失败。此时 HTTP 响应已经开始，无法回头改成新的错误页面。',
    steps: [
      'GET /headers-sent 先执行 res.write(...)：状态和响应头随第一块内容发出，res.headersSent 变成 true。',
      '随后 next(error) 进入自定义错误中间件；它发现 headersSent 为 true，只能继续 next(error)。',
      '默认处理器关闭连接以终止不完整的响应；经开发代理时浏览器也可能持续等待，页面会在 5 秒后停止等待。',
    ],
    code: "res.write('这部分已经写入');\nnext(new Error('响应开始后出错'));\n// 错误处理器中：if (res.headersSent) return next(err);",
    observation: '页面提示响应不完整；终端记录 headersSent=true 和连接关闭。直接用 curl 请求可能先看到 200 及部分内容，随后报告传输中断。',
    interpretation: '即使工具先显示 200，也不是成功完成：200 已随最初的 res.write 发出，连接后来异常关闭。此时不能再发送 500，因为响应头已经发出。',
    comparison: '在写出任何内容之前发生错误，可以由自定义或默认处理器完整返回错误响应；写出之后只能结束连接。实际流式接口应尽量在开始发送前完成可预检的操作。',
  },
];

const ErrorHandling = () => {
  const [selected, setSelected] = useState(examples[0]);
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
            <Text c="teal" fw={700} size="sm">EXPRESS / ERROR FLOW</Text>
            <Title order={1}>错误处理</Title>
            <Text c="dimmed">从错误产生、进入错误处理链，到最终响应或连接中断，逐步对照每条路径。</Text>
          </div>
          <Group gap="sm" justify="flex-end">
            <Badge color="teal" variant="light">Express 5</Badge>
            <DemoStructureDialog structure={structure} />
            <DemoKnowledgeDialog content={knowledge} demoName="错误处理" />
          </Group>
        </header>

        <div className={styles.workspace}>
          <nav aria-label="错误处理示例" className={styles.navigation}>
            {examples.map((example) => (
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
