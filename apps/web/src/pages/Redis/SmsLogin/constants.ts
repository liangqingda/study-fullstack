import type { DemoStructure } from '@/components/DemoStructureDialog';

/**
 * 代码结构弹窗展示的文件树。
 */
export const STRUCTURE: DemoStructure = {
  frontend: [
    {
      path: 'apps/web/src/pages/Redis/SmsLogin/index.tsx',
      role: '双客户端登录、共享会话视图与 Redis 操作日志。',
    },
    {
      path: 'apps/web/src/pages/Redis/SmsLogin/components/ClientPanel.tsx',
      role: '单个客户端的发码、登录、退出和 TTL 倒计时。',
    },
    {
      path: 'apps/web/src/pages/Redis/SmsLogin/components/RedisExplainer.tsx',
      role: 'Redis 原语说明区块。',
    },
    {
      path: 'apps/web/src/pages/Redis/SmsLogin/utils.ts',
      role: 'localStorage token/cooldown 读写与操作日志构造。',
    },
    {
      path: 'apps/web/src/pages/Redis/SmsLogin/constants.ts',
      role: '代码结构和知识点配置。',
    },
    {
      path: 'apps/web/src/pages/Redis/SmsLogin/types.ts',
      role: 'RedisOp 和 ClientPanelProps 类型定义。',
    },
    {
      path: 'apps/web/src/pages/Redis/SmsLogin/index.scss',
      role: '工作台与响应式布局。',
    },
    {
      path: 'apps/web/src/apis/index.ts',
      role: '从 OpenAPI 生成的调用方法，含 Bearer 头。',
    },
    { path: 'apps/web/src/utils/http/index.ts', role: 'axios 请求实例。' },
  ],
  backend: [
    { path: 'apps/api/src/services/app.ts', role: '挂载短信登录 Router。' },
    { path: 'apps/api/src/services/redis.ts', role: '创建 ioredis 客户端。' },
    {
      path: 'apps/api/src/express/sms-login/index.ts',
      role: '验证码、限频、会话建立与共享视图的全部 Redis 操作。',
    },
  ],
  schema: [
    {
      path: 'packages/schema/apis/redis/sms-login/index.ts',
      role: '发码、登录、校验、退出与会话列表契约。',
    },
    {
      path: 'packages/schema/apis/model/api-info.ts',
      role: '接口描述的数据结构。',
    },
  ],
  connection:
    '页面调用 POST send-code/login/logout、GET me/sessions；后端按共享契约校验，用 ioredis 读写同一份 Redis，会话集中存储、多端可见。',
  database:
    '不使用 PostgreSQL。验证码与会话全部存于 Redis：sms:code:{phone}（EX 60s）、sms:send:{phone}（限频 NX+EX）、session:{token}（EX 30min，访问时滑动续期）。',
};

/**
 * 知识点讲解弹窗的 Markdown 内容。
 */
export const KNOWLEDGE = `## 主题概述

登录会话要集中存储，让多个后端实例校验同一份 token。存在进程内内存 Session 只属于单个实例，进程重启或水平扩展时会丢失/不一致；存在 Redis 这份集中数据里，任何实例都指向同一状态，跨端、跨实例可见。

适用场景：水平扩展的后端、多客户端（浏览器/App）共享同一登录态、需要 TTL 自动过期的会话管理。

## 核心术语

| 术语 | 定义 | 为什么重要 | 最小示例 | 结果 |
| --- | --- | --- | --- | --- |
| Redis 键 | 命名空间下的一个值 | 用前缀组织不同用途的数据 | \`session:{token}\` | 一个会话一个键 |
| TTL / \`EX\` | 键的存活秒数 | 自动过期清理，不必手动删 | \`SET k v EX 60\` | 60s 后键消失 |
| \`NX\` | 仅当键不存在时写入 | 原子地实现"60s 内只允许一次" | \`SET k 1 EX 60 NX\` | 已存在则失败 |
| 滑动过期 | 每次访问续期 | 活跃用户不掉线 | \`EXPIRE key 1800\` | 重置存活时间 |
| \`SCAN\` | 游标式遍历键 | 不阻塞地列出匹配的键 | \`SCAN 0 MATCH session:*\` | 分页返回键集合 |
| Bearer Token | 请求头携带的访问凭证 | 会话校验的入口 | \`Authorization: Bearer <token>\` | 服务器据此找会话 |

## 会话流程：从发码到登出

1. **发码** \`POST /send-code\`：先限频检查 \`sms:send:{phone}\`；通过则生成 6 位码写入 \`sms:code:{phone}\`（EX 60s）。
2. **登录** \`POST /login\`：校验验证码；错误计数 \`sms:attempts:{phone}\` 达上限即作废验证码；成功则 \`DEL\` 验证码（一次性）并写 \`session:{token}\`（EX 30min）。
3. **鉴权** \`GET /me\`：按 Bearer token 查会话，命中则 \`EXPIRE\` 续期。
4. **登出** \`POST /logout\`：\`DEL\` 会话键。
5. **列表** \`GET /sessions\`：\`SCAN session:*\` 列出所有在线会话（生产环境关闭）。

## 用到的 Redis 原语

| 原语 | 用途 | 本案例中的含义 |
| --- | --- | --- |
| \`SET key val EX 60\` | 带有效期写入 | 验证码与会话过期自动清理 |
| \`SET key val NX\` | 仅键不存在时写入 | 60s 内限频，防刷验证码 |
| \`GET\` / \`DEL\` | 读取 / 删除 | 校验后立即删验证码，保证一次性 |
| \`EXPIRE\` | 续期 | 每次访问会话都滑动续期 |
| \`SCAN\` | 遍历键 | 遍历 \`session:*\` 列出在线会话 |

## demo 与结果（先猜后验）

先猜一猜：客户端 A 登录后，客户端 B 的会话列表里会出现 A 吗？

- 右侧"共享 Session 视图"就是这份集中状态：客户端 A、B 登录后都出现在同一张表里，登出则消失。
- 它直观说明会话不在某个浏览器进程里，而在 Redis 这一份数据里，任何客户端都读到同一份。

## 键结构

| 键 | 内容 | 有效期/约束 |
| --- | --- | --- |
| \`sms:code:{phone}\` | 验证码 | EX 60s |
| \`sms:send:{phone}\` | 发码限频标记 | NX + EX 60s |
| \`sms:attempts:{phone}\` | 登录尝试计数 | EX 60s，上限 5 次作废验证码 |
| \`session:{token}\` | 会话 | EX 30min，访问时滑动续期 |

## 两个设计的用意

1. **限频是服务端强制的**：\`sms:send:{phone}\` 用 \`NX + EX 60s\`，60 秒内再发会被拒绝；页面倒计时只是配合显示。
2. **验证码一次性 + 尝试限流**：验证码 \`GET\` 后立即 \`DEL\`，只能用一次；\`sms:attempts:{phone}\` 计数超限直接作废验证码，阻止针对 6 位码的暴力枚举。

## 边界与误区

- \`/sessions\` 暴露手机号与有效 token，属于敏感能力：生产环境返回 403，仅教学环境可用。
- token 由服务器用 \`randomBytes\` 生成，明文存 \`session:{token}\`；客户端存 localStorage 是教学简化，生产可换 HttpOnly Cookie。
- Redis 值损坏时 \`parseSession\` 返回 \`undefined\` 视为失效，而不是抛 500。
- 验证码错误不计入限频，但会递增尝试计数；达到上限后需重新获取验证码。

## 小结与练习

一句话：**共享会话的关键是把状态从"进程内"搬到 Redis 集中存储，用 TTL 控有效期、NX 做限频、EXPIRE 做滑动续期、DEL 保证一次性。**

练习（先自行判断再对照）：
1. 为什么验证码要 \`GET\` 后立即 \`DEL\`？
2. \`sms:send:{phone}\` 用 \`NX\` 解决什么问题？去掉 \`NX\` 会怎样？
3. \`/me\` 里 \`EXPIRE\` 续期解决了什么场景的问题？
4. 水平扩展到多个后端实例后，为什么进程内 Session 会失效，而 Redis 不会？
`;
