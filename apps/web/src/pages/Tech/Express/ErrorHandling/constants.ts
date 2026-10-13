import type { Example } from './types';

import type { DemoStructure } from '@/components/DemoStructureDialog/types';

/**
 * 错误处理的演示用例列表。
 */
export const EXAMPLES: Example[] = [
  {
    slug: 'sync',
    title: '同步抛错',
    subtitle: 'throw -> 默认处理器',
    purpose:
      '请求进入路由时直接抛出异常。这是最基本的错误入口：路由没有返回响应，Express 会接住错误并开始寻找错误处理器。',
    steps: [
      'GET /sync 进入路由；throw 立即中断当前处理函数，因此不会执行后续的成功响应代码。',
      'Express 捕获同步异常，跳过普通中间件，进入末尾的四参数错误中间件。',
      '本例的错误中间件对 /sync 调用 next(error)，所以最终由 Express 内置的默认错误处理器生成响应。',
    ],
    code: "router.get('/sync', () => {\n  throw new Error('同步路由中的演示错误');\n});",
    observation:
      '状态 500、Content-Type 为 text/html。开发环境的 HTML 包含错误消息和调用栈；NODE_ENV=production 时只返回状态说明，不暴露栈。',
    interpretation:
      '500 是因为 Error 没有指定有效的 err.status；HTML 而非 JSON 说明最终响应来自默认处理器。堆栈只适合开发调试，不应作为业务接口格式。',
    comparison:
      '同步路由里的 throw 会被 Express 捕获；定时器或文件回调里稍后抛出的错误不在这次同步调用栈内，需要在回调里捕获并调用 next(error)。',
  },
  {
    slug: 'async',
    title: '异步拒绝',
    subtitle: 'Promise -> 默认处理器',
    purpose:
      '路由需要 await 异步操作，而该操作失败。观察 Express 5 对返回的 Promise 如何自动接力。',
    steps: [
      'GET /async 调用 async 路由；await 遇到被拒绝的 Promise，路由返回的 Promise 也随之拒绝。',
      'Express 5 观察这个返回值，自动把拒绝原因传给 next(error)，从而进入错误处理链。',
      '自定义错误中间件继续传递，默认处理器生成 500 HTML；路由不必再写 try/catch 来重复转交。',
    ],
    code: "router.get('/async', async () => {\n  await Promise.reject(new Error('异步路由中的演示错误'));\n});",
    observation: '和同步抛错一样得到 500 HTML，但错误最初来自 Promise 拒绝。',
    interpretation:
      '响应格式和状态与同步场景相同，说明两种错误最终到达同一个默认处理器；区别在于错误进入处理链的方式。',
    comparison:
      '这是 Express 5 对"路由返回的 Promise"的自动处理，不等于任意回调中的错误也会自动被捕获。不要同时自动拒绝又手动 next(error)，避免重复转交。',
  },
  {
    slug: 'callback',
    title: '回调中的错误',
    subtitle: 'next(error) -> 默认处理器',
    purpose:
      '读取一个不存在的文件，演示 Node 风格回调在路由函数返回之后才报告错误的情况。',
    steps: [
      'GET /callback 发起 readFile；路由函数先返回，此时文件读取还没有完成。',
      '操作系统报告文件不存在，回调收到带 ENOENT 代码的错误；回调调用 next(error)。',
      'Express 才得以跳过普通处理器，依次交给本例的错误中间件和默认错误处理器。',
    ],
    code: "readFile('/express-error-handling-demo-missing-file', (error) => {\n  if (error) next(error);\n});",
    observation:
      '状态 500；开发环境的响应体中可见 ENOENT（文件不存在），终端可见回调转交错误的日志。',
    interpretation:
      'ENOENT 是文件系统错误码；这里没有把它映射成业务状态，所以默认处理器返回 500，而不是把"文件不存在"自动变成 HTTP 404。',
    comparison:
      '与 async/await 返回 Promise 不同，readFile 的回调不是路由返回的 Promise。直接在回调里 throw 可能成为未捕获异常；在回调里调用 next(error) 才能交给 Express。',
  },
  {
    slug: 'status',
    title: '状态与响应头',
    subtitle: 'next(error) -> 默认处理器',
    purpose:
      '错误不一定只能返回 500。为错误对象附加 HTTP 状态和响应头，观察默认处理器如何使用它们。',
    steps: [
      'GET /status 创建 Error，并设置 status=422、headers.X-Demo-Error=validation。',
      'next(error) 跳过普通处理器；本例的错误中间件继续 next(error)，没有自己写响应。',
      '默认处理器从 err.status 选择 422，并把 err.headers 加到响应中，再生成 HTML 错误页。',
    ],
    code: "const error = Object.assign(new Error('无效的演示输入'), {\n  status: 422, headers: { 'X-Demo-Error': 'validation' },\n});\nnext(error);",
    observation:
      '状态 422、X-Demo-Error: validation，响应体仍是默认处理器的 HTML；页面将状态和响应头分开显示。',
    interpretation:
      '422 来自 err.status，响应头来自 err.headers；默认处理器只接受 4xx/5xx 错误状态，其他值会按 500 处理。错误消息本身不会自动决定 HTTP 状态。',
    comparison:
      '与自定义处理器不同，这里没有调用 res.status(...).send(...)；我们只提供错误元数据，实际写响应的仍是 Express 内置处理器。',
  },
  {
    slug: 'custom',
    title: '自定义处理器',
    subtitle: '四参数中间件 -> JSON',
    purpose:
      '接口希望返回稳定的 JSON，而不是默认 HTML 或开发栈信息。由应用自己的错误处理中间件负责结束请求。',
    steps: [
      'GET /custom 调用 next(new Error(...))，Express 跳过普通中间件，进入路由后面的四参数错误中间件。',
      '处理器识别 /custom，用 res.status(500).json(...) 写入对客户端友好的消息并结束响应。',
      '因为已经响应且没有再调用 next(error)，默认处理器不会执行；其他场景则会继续交给它。',
    ],
    code: "router.use((err, req, res, next) => {\n  if (req.path === '/custom') {\n    res.status(500).json({ handler: 'custom', message: '服务器出错' });\n    return;\n  }\n  next(err);\n});",
    observation:
      '状态 500、Content-Type 为 application/json；响应体有 handler 和 message，没有内部错误堆栈。',
    interpretation:
      'JSON 是 res.json(...) 写出的，不是 Express 默认处理器的格式。客户端可依赖这个响应结构；错误详情应留在服务端日志而非响应体中。',
    comparison:
      '错误中间件必须有四个参数并放在路由之后；普通三参数中间件接不到 next(error)。若错误处理器既不响应也不 next，请求会挂起。',
  },
  {
    slug: 'headers-sent',
    title: '响应已开始',
    subtitle: 'headersSent -> 连接关闭',
    purpose:
      '模拟流式响应已经写出一部分后才失败。此时 HTTP 响应已经开始，无法回头改成新的错误页面。',
    steps: [
      'GET /headers-sent 先执行 res.write(...)：状态和响应头随第一块内容发出，res.headersSent 变成 true。',
      '随后 next(error) 进入自定义错误中间件；它发现 headersSent 为 true，只能继续 next(error)。',
      '默认处理器关闭连接以终止不完整的响应；经开发代理时浏览器也可能持续等待，页面会在 5 秒后停止等待。',
    ],
    code: "res.write('这部分已经写入');\nnext(new Error('响应开始后出错'));\n// 错误处理器中：if (res.headersSent) return next(err);",
    observation:
      '页面提示响应不完整；终端记录 headersSent=true 和连接关闭。直接用 curl 请求可能先看到 200 及部分内容，随后报告传输中断。',
    interpretation:
      '即使工具先显示 200，也不是成功完成：200 已随最初的 res.write 发出，连接后来异常关闭。此时不能再发送 500，因为响应头已经发出。',
    comparison:
      '在写出任何内容之前发生错误，可以由自定义或默认处理器完整返回错误响应；写出之后只能结束连接。实际流式接口应尽量在开始发送前完成可预检的操作。',
  },
];

/**
 * 代码结构弹窗展示的文件树。
 */
export const STRUCTURE: DemoStructure = {
  frontend: [
    {
      path: 'apps/web/src/pages/Express/ErrorHandling/index.tsx',
      role: '六种错误路径的讲解、请求操作与状态码、响应头和响应体展示。',
    },
    {
      path: 'apps/web/src/pages/Express/ErrorHandling/constants.ts',
      role: '六个示例数据、代码结构和知识点配置。',
    },
    {
      path: 'apps/web/src/pages/Express/ErrorHandling/types.ts',
      role: 'Example 和 Result 类型定义。',
    },
    {
      path: 'apps/web/src/pages/Express/ErrorHandling/index.scss',
      role: '错误结果、执行步骤和页面布局样式。',
    },
  ],
  backend: [
    {
      path: 'apps/api/src/services/app.ts',
      role: '将示例 Router 挂载到 /api/express/error-handling，并在路由之后挂载应用级错误处理器。',
    },
    {
      path: 'apps/api/src/apis/tech/express/error-handling/index.ts',
      role: '实现六条错误路由及四参数错误处理器，记录完成或连接关闭。',
    },
    {
      path: 'apps/api/src/middlewares/error-handler.ts',
      role: '处理示例 Router 继续转交的未发送响应错误；响应头已发送时再交给 Express 默认处理器。',
    },
  ],
  connection:
    '页面请求 /api/express/error-handling/{示例名}；路由触发错误后，示例处理器可直接返回 JSON，也可继续转交给应用级错误处理器。响应头已发送时继续进入 Express 默认处理器并关闭连接。',
  database: '无。错误由路由和文件读取模拟，不查询或修改数据库。',
};

/**
 * 知识点讲解弹窗的 Markdown 内容。
 */
export const KNOWLEDGE = `## 主题概述

Express 错误处理解决的是：请求处理过程中出错后，错误如何被接住、沿哪条链传递、由谁写出最终响应。核心是分清三件事：**错误从哪里来**、**以什么方式进入错误链**、**谁结束这次响应**。做对后，出错时客户端拿到的是受控响应，而不是进程崩溃、堆栈泄漏或请求挂起。

适用场景：需要统一接口错误格式、区分业务错误（4xx）与意外错误（5xx）、覆盖同步/异步/回调三种错误来源、或处理流式响应中途出错时。

## 核心术语

| 术语 | 定义 | 为什么重要 | 最小示例 | 结果 |
| --- | --- | --- | --- | --- |
| 错误处理中间件 | 有四个参数 \`(err, req, res, next)\` 的中间件 | 只有它能接收 \`next(error)\`，普通三参数中间件接不到 | \`router.use((err, req, res, next) => ...)\` | 错误进入错误链时执行 |
| \`next(error)\` | 把错误对象交给错误链 | 是同步调用栈之外（如回调里）的错误进入链的唯一通道 | \`next(new Error('x'))\` | 跳过后续普通处理器 |
| \`err.status\` | 附加在错误对象上的数字状态码 | 默认处理器据此选响应状态 | \`Object.assign(err, { status: 422 })\` | 返回 422 |
| \`err.headers\` | 附加在错误对象上的响应头 | 默认处理器把它合并进响应头 | \`{ headers: { 'X-Demo-Error': 'validation' } }\` | 响应带上该头 |
| \`res.headersSent\` | 响应头是否已发送的标志 | 为 \`true\` 后无法回头写错误响应 | \`res.write('x')\` 后变 \`true\` | 只能结束连接 |
| Express 5 的 Promise 处理 | Express 5 自动把被拒绝的路由 Promise 转给 \`next(error)\` | async 路由无需手动 \`try/catch\` 转交 | \`async () => await Promise.reject(err)\` | 自动进入错误链 |

## 错误从哪来：三种入口

| 来源 | 进入错误链的方式 | 代码 | 需手动转交 |
| --- | --- | --- | --- |
| 同步 \`throw\` | Express 自动捕获 | \`throw new Error(...)\` | 否 |
| async 里 \`await\` 到 rejected Promise | Express 5 自动 \`next(error)\` | \`await Promise.reject(...)\` | 否 |
| Node 风格回调 | 必须手动 \`next(error)\` | \`readFile(p, (err) => err && next(err))\` | 是 |

## 分步机制：错误链怎么走

请求进入路由 → 出错 → 经"自动或手动"变成 \`next(error)\` → 跳过后续普通处理器 → 四参数错误中间件 → 自己写响应结束，或 \`next(err)\` 继续 → 默认处理器兜底。

两个硬条件：**错误中间件必须放在路由之后**，且**必须有四个参数**，否则 Express 不把它当作错误处理器。

## demo 与结果（先猜后验）

先猜一猜：\`/status\` 返回什么状态码？\`/headers-sent\` 还能把响应改成 500 吗？

| 路径 | 入口 | 期望 | 实际结果 |
| --- | --- | --- | --- |
| \`/sync\` | 同步 \`throw\` | 500 | 默认处理器返回 500 HTML |
| \`/async\` | async 拒绝 | 500 | 同为 500，来自 Promise 拒绝 |
| \`/callback\` | readFile 回调 \`next(error)\` | 500 + ENOENT | 500；ENOENT 未被映射成 404 |
| \`/status\` | \`err.status=422\` + headers | 422 + \`X-Demo-Error\` | 422，响应头出现 |
| \`/custom\` | 交给自定义处理器 | 500 JSON | \`{ handler, message }\`，无堆栈 |
| \`/headers-sent\` | 先 \`res.write\` 再出错 | 无法改 500 | 连接关闭 / 传输中断 |

关键对照：

- \`/sync\` 与 \`/async\` 结果相同，因为最终都到达同一个默认处理器；区别只在错误进入链的方式（自动捕获 vs Promise 自动转交）。
- \`/status\` 的 422 来自 \`err.status\`，不是错误消息文本自动决定的状态。
- \`/headers-sent\` 即使工具先显示 200 也不算成功：200 已随最初的 \`res.write\` 发出，连接随后异常关闭。

## 谁能决定最终响应

| 角色 | 是否写响应 | 典型结果 |
| --- | --- | --- |
| 默认处理器（Express 内置） | 是 | 按 \`err.status\` 选状态、\`err.headers\` 加响应头，返回 HTML；生产环境不暴露堆栈 |
| 自定义处理器 | 是（自己 \`res.json(...)\`） | 返回稳定的业务格式，客户端可依赖 |
| 两者都不处理 | 否 | 请求挂起（既不响应也不 \`next(err)\`） |

## 边界与误区

- 回调里的 \`throw\` 不会被 Express 自动捕获，可能成为未捕获异常；必须 \`next(error)\`。
- \`err.status\` 只认 4xx/5xx，其他值按 500 处理。
- 错误消息文本不会自动决定 HTTP 状态，状态由 \`err.status\` 或处理器显式设置。
- \`res.headersSent === true\` 后不能再写错误响应，只能 \`next(err)\` 让默认处理器关闭连接。
- 错误中间件既不写响应也不 \`next(err)\`，请求会一直挂起。

## 小结与练习

一句话：**错误从不同来源进入链，沿"自动/手动转交 → 四参数错误中间件 → 默认处理器"传递；\`err.status\`/\`err.headers\` 决定状态与响应头；\`headersSent\` 是"还能不能改响应"的硬边界。**

练习（先自行判断再对照）：
1. 在回调里直接 \`throw\` 而不用 \`next(error)\`，预测会发生什么？为什么？
2. 想让某个错误返回 409 而不是 500，应该改哪个元数据？
3. 路由已 \`res.send('部分内容')\` 后再出错，错误处理器能否返回 JSON 500？为什么？
4. 自定义错误处理器返回 JSON 后，默认处理器还会执行吗？
`;
