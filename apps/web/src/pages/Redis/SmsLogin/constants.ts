import type { DemoStructure } from '@/components/DemoStructureDialog';

/**
 * 代码结构弹窗展示的文件树。
 */
export const STRUCTURE: DemoStructure = {
  frontend: [
    { path: 'apps/web/src/pages/Redis/SmsLogin/index.tsx', role: '双客户端登录、共享会话视图与 Redis 操作日志。' },
    { path: 'apps/web/src/pages/Redis/SmsLogin/components/ClientPanel.tsx', role: '单个客户端的发码、登录、退出和 TTL 倒计时。' },
    { path: 'apps/web/src/pages/Redis/SmsLogin/components/RedisExplainer.tsx', role: 'Redis 原语说明区块。' },
    { path: 'apps/web/src/pages/Redis/SmsLogin/utils.ts', role: 'localStorage token/cooldown 读写与操作日志构造。' },
    { path: 'apps/web/src/pages/Redis/SmsLogin/constants.ts', role: '代码结构和知识点配置。' },
    { path: 'apps/web/src/pages/Redis/SmsLogin/types.ts', role: 'RedisOp 和 ClientPanelProps 类型定义。' },
    { path: 'apps/web/src/pages/Redis/SmsLogin/index.scss', role: '工作台与响应式布局。' },
    { path: 'apps/web/src/apis/index.ts', role: '从 OpenAPI 生成的调用方法，含 Bearer 头。' },
    { path: 'apps/web/src/utils/http/index.ts', role: 'axios 请求实例。' },
  ],
  backend: [
    { path: 'apps/api/src/services/app.ts', role: '挂载短信登录 Router。' },
    { path: 'apps/api/src/services/redis.ts', role: '创建 ioredis 客户端。' },
    { path: 'apps/api/src/express/sms-login/index.ts', role: '验证码、限频、会话建立与共享视图的全部 Redis 操作。' },
  ],
  schema: [
    { path: 'packages/schema/apis/sms-login/index.ts', role: '发码、登录、校验、退出与会话列表契约。' },
    { path: 'packages/schema/apis/model/api-info.ts', role: '接口描述的数据结构。' },
  ],
  connection: '页面调用 POST send-code/login/logout、GET me/sessions；后端按共享契约校验，用 ioredis 读写同一份 Redis，会话集中存储、多端可见。',
  database: '不使用 PostgreSQL。验证码与会话全部存于 Redis：sms:code:{phone}（EX 60s）、sms:send:{phone}（限频 NX+EX）、session:{token}（EX 30min，访问时滑动续期）。',
};

/**
 * 知识点讲解弹窗的 Markdown 内容。
 */
export const KNOWLEDGE = `## 为什么"共享 session"用 Redis

登录会话要集中存储，让多个后端实例校验同一份 token。存在进程内内存 Session 只属于单个实例；存在 Redis 这份集中数据里，任何实例都指向同一状态，跨端、跨实例可见。

## 用到的 Redis 原语

| 原语 | 用途 | 本案例中的含义 |
| --- | --- | --- |
| \`SET key val EX 60\` | 带有效期写入 | 验证码与会话都会过期自动清理 |
| \`SET key val NX\` | 仅键不存在时写入 | 60s 内限频，防刷验证码 |
| \`GET\` / \`DEL\` | 读取 / 删除 | 校验后立即删验证码，保证一次性 |
| \`EXPIRE\` | 续期 | 每次访问会话都滑动续期，活跃用户不掉线 |
| \`SCAN\` | 遍历键 | 遍历 \`session:*\` 列出所有在线会话 |

## 两个设计的用意

1. **限频是服务端强制的**：\`sms:send:{phone}\` 用 \`NX + EX 60s\`，60 秒内再发会被拒绝；页面倒计时只是配合显示。
2. **会话是一次性验证码 + 集中式 Token**：验证码 \`GET\` 后立即 \`DEL\`，只能用一次；登录建立的 \`session:{token}\` 存在 Redis，\`/me\` 访问时 \`EXPIRE\` 续期。

## 键结构

- \`sms:code:{phone}\` — 验证码，\`EX 60s\`
- \`sms:send:{phone}\` — 限频标记，\`NX + EX 60s\`
- \`session:{token}\` — 登录会话，\`EX 30min\`，访问时滑动续期

## 页面能证明什么

右侧"共享 Session 视图"就是这份集中状态：客户端 A、B 登录后都出现在同一张表里，登出则消失。它直观说明会话不在某个浏览器进程里，而在 Redis 这一份数据里。
`;
