import type { NetworkPhase, PhaseKey, PresetUrl, RenderPhase } from './types';

import type { DemoStructure } from '@/components/DemoStructureDialog/types';

/**
 * 每个网络阶段的功能色（按协议/阶段编码，而非装饰）：
 * 颜色即信息——DNS 琥珀、TCP 青、TLS 紫、HTTP 蓝、服务端绿、响应体玫红、
 * URL 中性灰。仅在链路条与阶段点中使用，页面其余部分保持中性。
 */
export const PHASE_COLORS: Record<PhaseKey, string> = {
  url: '#6b7280',
  dns: '#b0893a',
  tcp: '#0f7f8c',
  tls: '#6d5bd0',
  request: '#2f6fe4',
  wait: '#2e8f5e',
  body: '#c14a7a',
};

/**
 * 页面的默认目标 URL：https 能演示完整链路（含 TLS 握手）。
 */
export const INITIAL_URL = 'https://example.com';

/**
 * 后端接口基础路径（对应 schema 契约 /api/http/url-to-page/load）。
 */
export const BASE_PATH = '/api/http/url-to-page/load';

/**
 * 网络链路的静态阶段定义。顺序即"浏览器输入 URL 到页面展示"的网络部分；
 * TLS 阶段在 http 请求下实测为 0，页面用 note 说明被跳过。
 */
export const NETWORK_PHASES: NetworkPhase[] = [
  {
    key: 'url',
    label: 'URL 解析',
    note: '浏览器拆解协议、主机、端口、路径与查询串，并检查是否有本地缓存命中。',
    hue: 'url',
  },
  {
    key: 'dns',
    label: 'DNS 解析',
    note: '把域名解析成 IP：依次查浏览器缓存、系统缓存、hosts，未命中再走 DNS 服务器。',
    hue: 'dns',
  },
  {
    key: 'tcp',
    label: 'TCP 连接',
    note: '与服务器建立 TCP 连接，即 SYN → SYN+ACK → ACK 三次握手，保证可靠字节流。',
    hue: 'tcp',
  },
  {
    key: 'tls',
    label: 'TLS 握手',
    note: 'https 下协商加密套件、校验证书并交换密钥；http 请求无此阶段，直接明文传输。',
    hue: 'tls',
  },
  {
    key: 'request',
    label: '发送请求',
    note: '向服务器发出请求行（方法、路径、HTTP 版本）与请求头。',
    hue: 'request',
  },
  {
    key: 'wait',
    label: '服务端处理',
    note: '等待响应首字节：包含请求上行 + 服务端处理 + 响应下行，通常是最耗时的部分。',
    hue: 'wait',
  },
  {
    key: 'body',
    label: '接收响应体',
    note: '接收服务端返回的响应体；随后浏览器开始解析与渲染。',
    hue: 'body',
  },
];

/**
 * 浏览器渲染阶段的示意（发生在浏览器端，无法用服务端请求实测，
 * 页面用静态示意展示其顺序）。
 */
export const RENDER_PHASES: RenderPhase[] = [
  {
    label: '解析 HTML → DOM',
    detail: '把 HTML 字节解析成文档对象模型；遇到外链脚本会先阻塞解析。',
  },
  {
    label: '解析 CSS → CSSOM',
    detail: '把样式表解析成样式对象模型，供后续匹配样式。',
  },
  {
    label: '合成渲染树',
    detail: '合并 DOM 与 CSSOM，保留可见节点及其样式。',
  },
  {
    label: '布局 Layout',
    detail: '计算每个节点的几何位置与尺寸（回流）。',
  },
  {
    label: '绘制 Paint',
    detail: '把节点绘制成像素，按层绘制。',
  },
  {
    label: '合成 Composite',
    detail: '把各图层按正确的层叠顺序合成到屏幕。',
  },
];

/**
 * 预设 URL 快捷项：覆盖含 TLS、无 TLS、4xx 与连接失败四种观察点。
 */
export const PRESET_URLS: PresetUrl[] = [
  {
    label: 'https 全链路',
    url: 'https://example.com',
    hint: '含 DNS + TCP + TLS，观察加密握手耗时。',
  },
  {
    label: '本仓库服务（无 TLS）',
    url: 'http://localhost:3001/api/express/response-methods/json',
    hint: '无 TLS 握手；服务端就是正在运行的后端。',
  },
  {
    label: '4xx 响应',
    url: 'https://example.com/404',
    hint: '请求仍完成，观察非 2xx 状态码的处理。',
  },
  {
    label: '连接失败',
    url: 'http://localhost:1',
    hint: 'TCP 被拒，观察错误阶段与错误文案。',
  },
];

/**
 * 代码结构弹窗展示的文件树。
 */
export const STRUCTURE: DemoStructure = {
  frontend: [
    {
      path: 'apps/web/src/pages/Http/UrlToPage/index.tsx',
      role: '输入 URL、触发加载，组织链路揭示、结果与渲染示意。',
    },
    {
      path: 'apps/web/src/pages/Http/UrlToPage/hooks/useUrlToPage.ts',
      role: '调用后端接口并管理 loading / result / error 三态。',
    },
    {
      path: 'apps/web/src/pages/Http/UrlToPage/components/JourneyBar.tsx',
      role: '按实测耗时比例排布的横向链路条。',
    },
    {
      path: 'apps/web/src/pages/Http/UrlToPage/components/PhaseList.tsx',
      role: '逐阶段揭示的纵向链路列表。',
    },
    {
      path: 'apps/web/src/pages/Http/UrlToPage/components/ResultPanel.tsx',
      role: '展示服务端返回摘要与响应体片段。',
    },
    {
      path: 'apps/web/src/pages/Http/UrlToPage/components/RenderPipeline.tsx',
      role: '浏览器端渲染流程的静态示意。',
    },
    {
      path: 'apps/web/src/pages/Http/UrlToPage/constants.ts',
      role: '阶段定义、预设 URL、代码结构与知识点配置。',
    },
    {
      path: 'apps/web/src/pages/Http/UrlToPage/types.ts',
      role: '阶段与状态类型定义。',
    },
    {
      path: 'apps/web/src/pages/Http/UrlToPage/index.scss',
      role: '页面、链路条与阶段列表样式。',
    },
  ],
  backend: [
    {
      path: 'apps/api/src/services/app.ts',
      role: '将 Router 挂载到 /api/http/url-to-page。',
    },
    {
      path: 'apps/api/src/apis/tech/http/url-to-page/index.ts',
      role: '用 Node 原生 http/https 发起真实请求，实测各阶段耗时并打印日志。',
    },
  ],
  schema: [
    {
      path: 'packages/schema/apis/http/url-to-page/index.ts',
      role: 'LoadRequest / LoadPhase / LoadResponse / LoadError 与 loadApi 契约。',
    },
  ],
  connection:
    '页面把目标 URL POST 到 /api/http/url-to-page/load；后端用 Node 原生 http/https 发起真实请求，逐阶段计时后返回 phases（含各阶段毫秒）与 result（状态码、Content-Type、响应体长度）。前端按顺序揭示阶段，并画出按耗时比例排布的 journey bar。',
  database: '无。请求只访问目标 URL，不查询或修改数据库。',
};

/**
 * 知识点讲解弹窗的 Markdown 内容。
 */
export const KNOWLEDGE = `## 主题概述

在地址栏输入 URL、敲下回车，到页面出现在屏幕上，中间不是"一下就到"，而是一条**由浏览器、DNS、网络、服务器和渲染引擎接力完成的链路**。这条链路可分成两段：

1. **网络链路**（本 demo 用真实请求逐阶段实测）：URL 解析 → DNS → TCP → TLS（仅 https）→ 发送请求 → 服务端处理 → 接收响应体；
2. **浏览器渲染**（发生在浏览器端，无法用服务端请求实测）：解析 HTML/CSS → 渲染树 → 布局 → 绘制 → 合成。

理解这条链路，就知道"慢"到底慢在哪：是 DNS 慢、TCP/TLS 握手慢，还是服务端处理慢，从而对症优化。

## 核心术语

| 术语 | 定义 | 为什么重要 | 最小示例 | 结果 |
| --- | --- | --- | --- | --- |
| URL | 统一资源定位符，指明资源在哪里 | 解析出的协议/主机/端口/路径决定后续每一步 | \`https://example.com:443/a\` | 协议 https、主机 example.com、端口 443、路径 /a |
| DNS | 域名系统，把域名解析成 IP | 没有它浏览器不知道连哪个服务器 | 解析 example.com → 93.184.216.34 | 得到 IP |
| TCP | 传输层可靠连接 | 保证数据有序、不丢失 | SYN→SYN-ACK→ACK 三次握手 | 建立连接 |
| TLS | 传输层安全协议 | 加密通信、校验证书，防止窃听/篡改 | ClientHello → 证书 → 密钥交换 | 建立加密信道 |
| HTTP 请求/响应 | 应用层协议，规定语义 | 请求行/头/体 与 状态行/头/体 | \`GET /a HTTP/1.1\` + \`200 OK\` | 拿到响应 |
| DOM | 文档对象模型 | 页面结构的内存表示 | HTML → DOM 树 | 可被脚本操作的树 |
| CSSOM | 样式对象模型 | 样式规则的内存表示 | CSS → CSSOM 树 | 可匹配样式的树 |
| 渲染树 | DOM 与 CSSOM 的合并 | 决定哪些节点可见、长什么样 | 合并 → 可见节点+样式 | 参与后续布局的树 |
| Layout / Paint | 布局与绘制 | 计算几何、输出像素 | 计算盒子位置尺寸 → 绘制 | 屏幕上出现内容 |

## 分步机制：网络链路（先猜后验）

本 demo 用 Node 原生 \`http/https\` 发起真实请求，分别用 \`lookup\` 回调、socket 的 \`connect\`/\`secureConnect\` 事件、请求 \`finish\` 事件、响应 headers 与 \`end\` 事件，实测每段耗时：

| 阶段 | 测的是什么 | 影响它的因素 |
| --- | --- | --- |
| URL 解析 | \`new URL(...)\` 的耗时 | 通常可忽略（本地解析） |
| DNS | \`dns.lookup\` 回调耗时 | 缓存命中与否、递归查询、网络 |
| TCP | socket \`connect\` 事件耗时 | 物理距离、握手往返 |
| TLS | \`secureConnect\` 与 \`connect\` 的差值 | 证书链长度、RSA/ECDSA、加密套件 |
| 发送请求 | 请求 \`finish\` 与就绪时刻的差值 | 上行带宽、请求体大小 |
| 服务端处理 | 请求发出到响应头到达 | 服务端逻辑、网络往返（通常最慢） |
| 接收响应体 | 响应头到 \`end\` | 响应体大小、下行带宽 |

> 说明：DNS 是"先本地缓存后递归查询"，所以多次访问同一域名会越来越快；TLS 只在 https 下存在，\`http\` 请求本 demo 会把该阶段记 0ms 并标注"跳过"。

## demo 与结果

**预测先于验证**：连 \`http://localhost:3001/api/express/response-methods/json\`（本仓库后端）和 \`https://example.com\`，猜哪个 TLS 有值、哪个没有？哪个阶段的耗时最可能占大头？

| 预设 | 期望链路 | 关键观察 |
| --- | --- | --- |
| \`https://example.com\` | URL→DNS→TCP→TLS→… | TLS 有实测值；wait 通常占大头 |
| \`http://localhost:3001/...\` | 无 TLS | TLS 记 0ms，标注跳过 |
| \`https://example.com/404\` | 完整链路 | 状态 404，仍正常返回响应体 |
| \`http://localhost:1\` | DNS→TCP 失败 | 链路停在 TCP，返回错误文案 |

页面会把每个阶段按顺序"揭示"为已完成（此时显示真实毫秒），并用一条按耗时比例排布的 journey bar 让你一眼看出时间花在哪。后端同时在日志打印每个阶段的耗时（\`[url-to-page] phase ...\`）。

## 常见误区

- **"输入 URL 后直接就发请求"**：实际先有 URL 解析、DNS、TCP、TLS 等前置步骤，\`\`wait\`\`（服务端处理）常常是耗时大头。
- **"https 只比 http 慢一点点"**：TLS 握手要额外一到两个往返，本 demo 的 TLS 阶段就是它的实测代价。
- **"DNS 每次都一样慢"**：命中缓存会快很多；首次访问才是最慢的。
- **"状态码 4xx/5xx 就是没连上"**：4xx/5xx 说明 TCP/TLS/HTTP 链路已建立、服务器确实响应了；连不上是 \`ECONNREFUSED\`/\`ENOTFOUND\` 这类网络错误。
- **"拿到响应体页面就出来了"**：不，还有浏览器端的 HTML/CSS 解析、渲染树、布局、绘制、合成。
- **"服务端返回的 \`Content-Length\` 就等于响应体长度"**：分块传输（\`Transfer-Encoding: chunked\`）时没有该头，本 demo 对两种情况都单独统计实际读取字节数。

## 边界

- 本 demo 用 \`agent: false\` 强制每次新建连接，才能测到 TCP/TLS 阶段；真实浏览器会复用 keep-alive 连接，重复访问时握手阶段会显著缩短甚至跳过。
- 本 demo 不跟随重定向（如实上报 3xx 状态码），真实浏览器会自动跟随。
- 浏览器渲染阶段无法用服务端请求实测，页面用静态示意展示其顺序；真实渲染还会涉及脚本执行、预加载、缓存、子资源并发等。
- 外部站点可能因网络或防火墙不稳定，属预期现象；连接失败会清晰标注失败阶段。

## 小结与练习

一句话：**输入 URL 到页面展示 = 一条由浏览器、DNS、网络、服务器、渲染引擎接力完成的链路，慢在哪个环节要看实测，而不是凭感觉。**

练习（先自行判断再对照）：
1. 为什么重复访问同一域名会越来越快？哪个阶段受益最大？
2. \`http\` 请求与 \`https\` 请求的链路差在哪一步？
3. "连不上"和"404"是一回事吗？分别对应哪个阶段、哪类错误？
4. 服务端处理（wait）和接收响应体（body）各受什么因素影响？
5. 想减少 TLS 握手开销，可以从哪些方向优化？
`;
