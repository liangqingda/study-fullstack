# PostgreSQL 事务实验

对应[事务笔记](https://app.notion.com/p/369e53543860804c9204f9002dd3f7a1#f3c60132c3ee4eeaaba0949354463f01)。可优先打开 React 的 `/postgres/transactions` 页面运行六个真实数据库实验；本文件保留手动双终端练习。使用 PostgreSQL 的 `psql` 时，先在本地环境配置指向 **study_nodejs** 的 `DATABASE_URL`，不要把凭据提交到仓库。每个脚本首先输出并校验 `current_database()`；若不是 `study_nodejs`，立刻停止。以下命令从仓库根目录运行。单连接实验使用临时表，退出连接即消失；并发实验创建两个专用表，只重置各自的演示行。不要在其他人正在使用这些行时重新初始化。

## 1. 原子性与中止状态

**预测**：A=500、B=200，扣 100、加 100 后，流水插入主键冲突。`SELECT` 能否看到扣款？回滚后两账户是多少？

```sh
psql "$DATABASE_URL" -f src/express/postgres/transactions/01-atomicity.sql
```

脚本先创建临时账户和流水，再用一个 `BEGIN` 包住两次 `UPDATE` 和流水插入。故意重复流水 ID 后，PostgreSQL 报 `23505`；同一事务中的下一条 `SELECT` 报 `25P02`（事务已中止），不是返回暂时余额。`ROLLBACK` 后查询得到 `(1,500)`、`(2,200)`，流水仍只有预置的 1 条；这条旧流水不是本次转账。脚本仅对预期的两条错误临时关闭 `ON_ERROR_STOP`。

## 2. SAVEPOINT 局部回退

**预测**：保存点之后先插入商品 10，再重复插入同一商品造成主键冲突。回到保存点之后，商品 10 会留下吗？

```sh
psql "$DATABASE_URL" -f src/express/postgres/transactions/02-savepoint.sql
```

`23505` 后执行 `ROLLBACK TO SAVEPOINT before_items`，会同时撤销保存点之后成功的商品 10；随后插入商品 11 并 `COMMIT`。最终订单 1 存在，明细只有 `(1,11)`。`RELEASE SAVEPOINT` 不会单独提交外层事务。脚本仅对预期的冲突临时关闭 `ON_ERROR_STOP`。

## 3. READ COMMITTED 与 REPEATABLE READ

**预测**：A 首次读库存 10，B 改为 9 并提交，A 再读是什么？两种隔离级别为何不同？先初始化一次：

```sh
psql "$DATABASE_URL" -f src/express/postgres/transactions/03-snapshot-setup.sql
```

打开两个独立的 `psql "$DATABASE_URL"` 终端，严格按下列顺序逐段执行。A 的事务未结束时不要重跑初始化。

| 顺序 | 会话 A | 会话 B | 观察 |
| --- | --- | --- | --- |
| 1 | `BEGIN ISOLATION LEVEL READ COMMITTED; SELECT stock FROM demo_transactions_stock WHERE id = 1;` | | 10 |
| 2 | 保持事务开启 | `UPDATE demo_transactions_stock SET stock = 9 WHERE id = 1;` | B 自动提交 |
| 3 | `SELECT stock FROM demo_transactions_stock WHERE id = 1; COMMIT;` | | 9，新语句取得新快照，发生不可重复读 |

重跑初始化脚本，将库存恢复为 10；重新按顺序执行：

| 顺序 | 会话 A | 会话 B | 观察 |
| --- | --- | --- | --- |
| 1 | `BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT stock FROM demo_transactions_stock WHERE id = 1;` | | 10，首次查询建立快照 |
| 2 | 保持事务开启 | `UPDATE demo_transactions_stock SET stock = 9 WHERE id = 1;` | B 自动提交 |
| 3 | `SELECT stock FROM demo_transactions_stock WHERE id = 1; COMMIT; SELECT stock FROM demo_transactions_stock WHERE id = 1;` | | 事务内仍为 10，新事务为 9 |

`BEGIN` 本身不固定数据快照。A 在第 2 步前的第一次查询是关键；普通 `SELECT` 不会被 B 的更新锁阻塞。若想继续试同一行并发写，在 A 的 `REPEATABLE READ` 事务内第 3 步先执行 `UPDATE demo_transactions_stock SET stock = stock - 1 WHERE id = 1;`，会得到 `40001`，须 `ROLLBACK` 并从事务开头重试。

## 4. 写偏斜与 SERIALIZABLE

**预测**：两位医生都在岗；A、B 两个事务各看到在岗人数为 2，各自让不同医生下班。最终可能为 0 吗？

```sh
psql "$DATABASE_URL" -f src/express/postgres/transactions/04-serializable-setup.sql
```

再次打开两个独立的 `psql "$DATABASE_URL"` 终端，逐步执行：

| 顺序 | 会话 A | 会话 B |
| --- | --- | --- |
| 1 | `BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT count(*) FROM demo_transactions_on_call WHERE active;` | |
| 2 | | `BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT count(*) FROM demo_transactions_on_call WHERE active;` |
| 3 | `UPDATE demo_transactions_on_call SET active = false WHERE doctor = 'A';` | |
| 4 | | `UPDATE demo_transactions_on_call SET active = false WHERE doctor = 'B';` |
| 5 | `COMMIT;` | `COMMIT;` |

两边先各自读到 2，且修改不同行，都可能成功；新事务查询 `SELECT count(*) FROM demo_transactions_on_call WHERE active;` 得到 0，跨行“至少一人在岗”规则被破坏。重跑初始化脚本，把两处 `REPEATABLE READ` 都换为 `SERIALIZABLE`，按同样顺序再做一次。这次不能两边都成功提交；其中一个可能在 `UPDATE` 或 `COMMIT` 收到 `40001`，具体是哪边取决于时序。最终在岗人数为 1。失败方先 `ROLLBACK`（若已经退出事务，此命令只给出警告），然后从 `BEGIN` 起重试，重新读到 1，业务判断应拒绝下班；不能只重跑最后一条 `UPDATE`。实际服务应对 `40001` 和死锁 `40P01` 做有限次数的整事务重试，并避免在可重试事务中发送不可撤回的外部消息。

数据库变更：前两组只有会话临时表；后两组建立或复用 `demo_transactions_stock` 和 `demo_transactions_on_call`，初始化仅重置 ID 1、医生 A/B 的演示行，不删除其他行或表。实验完毕不必清理专用表，重复实验前重新初始化即可。
