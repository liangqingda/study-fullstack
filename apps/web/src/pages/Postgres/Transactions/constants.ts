import type { Example } from './types';

import type { DemoStructure } from '@/components/DemoStructureDialog';

/**
 * 事务隔离级别的演示场景列表。
 */
export const EXAMPLES: Example[] = [
  { key: 'atomicity', title: '原子性与中止状态', subtitle: '转账三步一起成败', question: 'A=500、B=200；扣款和入账后流水主键冲突，余额是多少？', expected: '先报 23505，继续查询报 25P02；回滚后仍是 500 / 200。', code: 'BEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\nINSERT INTO entries VALUES (1, 99); -- 冲突\nROLLBACK;', explanation: '错误令显式事务进入中止状态；ROLLBACK 撤销两次成功的 UPDATE。', comparison: '没有 BEGIN 时，语句各自提交，无法将三步一并回滚。' },
  { key: 'savepoint', title: 'SAVEPOINT 局部回退', subtitle: '只撤销保存点之后的工作', question: '保存点后插入商品 10，再发生主键冲突；商品 10 会留下吗？', expected: '商品 10 被回退，之后插入的商品 11 随外层事务提交。', code: 'BEGIN;\nSAVEPOINT before_items;\nINSERT INTO entries VALUES (2, 10);\nINSERT INTO entries VALUES (1, 99); -- 冲突\nROLLBACK TO SAVEPOINT before_items;\nINSERT INTO entries VALUES (3, 11);\nCOMMIT;', explanation: 'ROLLBACK TO 会撤销保存点之后的所有修改，包括成功的插入。', comparison: '保存点不是真正的嵌套事务，最终仍由外层 COMMIT 决定。' },
  { key: 'read-committed', title: 'READ COMMITTED', subtitle: '每条语句获得新快照', question: 'A 先读库存 10，B 改成 9 并提交；A 再读是多少？', expected: '10 → 9；这是不可重复读，不是脏读。', code: 'A: BEGIN ISOLATION LEVEL READ COMMITTED;\nA: SELECT stock; -- 10\nB: UPDATE stock = 9; -- 已提交\nA: SELECT stock; -- 9', explanation: 'A 的第二条 SELECT 得到新快照，看到 B 已提交的行版本。', comparison: 'REPEATABLE READ 在事务内复用首次查询建立的快照。' },
  { key: 'repeatable-read', title: 'REPEATABLE READ', subtitle: '事务内稳定读取', question: '同样顺序下，B 提交后 A 第二次还会读到 10 吗？', expected: 'A 两次都读到 10；提交后的新查询读到 9。', code: 'A: BEGIN ISOLATION LEVEL REPEATABLE READ;\nA: SELECT stock; -- 建立快照：10\nB: UPDATE stock = 9; -- 已提交\nA: SELECT stock; -- 仍为 10', explanation: 'BEGIN 本身不固定数据快照；首次查询建立快照，之后的普通查询复用它。', comparison: '稳定快照不能自动保护跨行约束，见写偏斜。' },
  { key: 'write-skew', title: '写偏斜', subtitle: '跨行规则仍可能被破坏', question: '两位医生各看到 2 人值班，分别让自己下班；最后还有人吗？', expected: 'REPEATABLE READ 下两边都可能提交，最终为 0 人。', code: 'A/B: BEGIN ISOLATION LEVEL REPEATABLE READ;\nA/B: SELECT count(*) WHERE active; -- 各为 2\nA: UPDATE doctor_A SET active = false;\nB: UPDATE doctor_B SET active = false;\nA/B: COMMIT;', explanation: '两个事务修改不同行，却都依赖对方即将改变的旧数据。', comparison: '改用 SERIALIZABLE，再观察同样时序的 40001。' },
  { key: 'serializable', title: 'SERIALIZABLE', subtitle: '拒绝无法串行解释的结果', question: '相同的两次下班请求还能都成功吗？', expected: '一方得到 40001，最终仍有 1 人在岗。', code: 'A/B: BEGIN ISOLATION LEVEL SERIALIZABLE;\nA/B: SELECT count(*) WHERE active; -- 各为 2\nA: UPDATE doctor_A SET active = false;\nB: UPDATE doctor_B SET active = false;\nA/B: COMMIT; -- 一方报 40001', explanation: 'SSI 检测到相互冲突的读写依赖，拒绝不可能串行化的提交。', comparison: '必须从 BEGIN 重新查询和判断，不能只重试失败的 UPDATE。' },
];

/**
 * 代码结构弹窗展示的文件树。
 */
export const STRUCTURE: DemoStructure = {
  frontend: [
    { path: 'apps/web/src/pages/Postgres/Transactions/index.tsx', role: '选择实验，展示预测、会话执行顺序和实际结果。' },
    { path: 'apps/web/src/pages/Postgres/Transactions/constants.ts', role: '六个场景数据、代码结构和知识点配置。' },
    { path: 'apps/web/src/pages/Postgres/Transactions/types.ts', role: 'Scenario、Result 和 Example 类型定义。' },
    { path: 'apps/web/src/pages/Postgres/Transactions/index.scss', role: '实验工作台与响应式布局。' },
    { path: 'apps/web/src/apis/index.ts', role: '从 OpenAPI 生成的事务调用方法。' },
    { path: 'apps/web/src/utils/http/index.ts', role: 'axios 请求实例。' },
  ],
  backend: [
    { path: 'apps/api/src/services/app.ts', role: '挂载事务 Router。' },
    { path: 'apps/api/src/express/transactions/index.ts', role: '请求及响应校验、错误处理。' },
    { path: 'apps/api/src/express/transactions/run.ts', role: '真实数据库事务与结果记录。' },
  ],
  schema: [
    { path: 'packages/schema/apis/transactions/index.ts', role: '场景枚举、请求、结果及错误契约。' },
    { path: 'packages/schema/apis/model/api-info.ts', role: '接口描述的数据结构。' },
  ],
  connection: '页面调用生成的 POST /api/transactions/run；后端按共享契约校验，在一个或两个 PostgreSQL 连接上执行，再返回按会话排序的实际步骤。',
  database: '仅使用 study_nodejs。单连接场景使用临时表；并发场景复用或创建 demo_transactions_stock 与 demo_transactions_on_call，每次运行只写入并清理自己的演示行。',
};

/**
 * 知识点讲解弹窗的 Markdown 内容。
 */
export const KNOWLEDGE = `## 为什么需要事务

多条 SQL 要"一起成、一起败"。没有 \`BEGIN\` 时每条语句各自提交，无法整体回滚。

## 事务边界

\`BEGIN\` 开始一个事务，\`COMMIT\` 提交，\`ROLLBACK\` 回滚。一旦出错，事务进入**中止状态**：后续语句报 \`25P02\`，只有 \`ROLLBACK\` 能撤销已成功的修改（原子性）。

- 主键冲突常见报 \`23505\`。
- 中止状态后继续查询报 \`25P02\`。

## SAVEPOINT：只撤销一部分

\`SAVEPOINT name\` 设一个回滚点，\`ROLLBACK TO SAVEPOINT name\` 只撤销该点之后的修改，后续工作可以随外层 \`COMMIT\` 提交。它不是真正的嵌套事务，最终由外层事务决定。

## 隔离级别与快照

隔离级别决定一个事务能看到哪些已提交数据：

| 级别 | 行为 | 观察到的现象 |
| --- | --- | --- |
| READ COMMITTED | 每条语句获得新快照 | 事务内两次读可能不同（不可重复读） |
| REPEATABLE READ | 复用首次查询建立的快照 | 事务内稳定读取 |
| SERIALIZABLE | 拒绝无法串行化的提交 | 冲突时一方报 \`40001\` |

\`BEGIN\` 本身不固定快照；**首次查询**才建立快照。

## 不可重复读 ≠ 脏读

READ COMMITTED 下 A 第二次读到的是 B **已提交**的数据（10 → 9），这是不可重复读，不是读到未提交的脏数据。

## 写偏斜：REPEATABLE READ 也拦不住

两个事务各自读到同一份旧数据，再去**修改不同的行**。快照一致让两边都能提交，却破坏了跨行约束（医生全下班）。REPEATABLE READ 不保护这类规则，SERIALIZABLE 的 SSI 检测才能拒绝（\`40001\`）。
`;
