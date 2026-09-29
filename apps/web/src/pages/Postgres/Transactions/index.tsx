import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Group, Text, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { TransactionError } from '@liangqingda/study-nodejs-schema';

import type { DemoStructure } from '@/components/DemoStructureDialog';
import { postApiTransactionsRun } from '@/apis';
import DemoStructureDialog from '@/components/DemoStructureDialog';
import { isAxiosError } from '@/utils/http';

import styles from './index.scss';

type Scenario = Parameters<typeof postApiTransactionsRun>[0]['body']['scenario'];
type Result = Awaited<ReturnType<typeof postApiTransactionsRun>>['data'];

const structure: DemoStructure = {
  frontend: [
    { path: 'src/pages/Postgres/Transactions/index.tsx', role: '选择实验，展示预测、会话执行顺序和实际结果。' },
    { path: 'src/pages/Postgres/Transactions/index.scss', role: '实验工作台与响应式布局。' },
    { path: 'src/apis/index.ts', role: '从 OpenAPI 生成的事务调用方法。' },
    { path: 'src/utils/http/index.ts', role: 'axios 请求实例。' },
  ],
  backend: [
    { path: 'src/services/app.ts', role: '挂载事务 Router。' },
    { path: 'src/express/transactions/index.ts', role: '请求及响应校验、错误处理。' },
    { path: 'src/express/transactions/run.ts', role: '真实数据库事务与结果记录。' },
  ],
  schema: [
    { path: 'apis/transactions/index.ts', role: '场景枚举、请求、结果及错误契约。' },
    { path: 'apis/model/api-info.ts', role: '接口描述的数据结构。' },
  ],
  connection: '页面调用生成的 POST /api/transactions/run；后端按共享契约校验，在一个或两个 PostgreSQL 连接上执行，再返回按会话排序的实际步骤。',
  database: '仅使用 study_nodejs。单连接场景使用临时表；并发场景复用或创建 demo_transactions_stock 与 demo_transactions_on_call，每次运行只写入并清理自己的演示行。',
};

const examples: { key: Scenario; title: string; subtitle: string; question: string; expected: string; code: string; explanation: string; comparison: string }[] = [
  { key: 'atomicity', title: '原子性与中止状态', subtitle: '转账三步一起成败', question: 'A=500、B=200；扣款和入账后流水主键冲突，余额是多少？', expected: '先报 23505，继续查询报 25P02；回滚后仍是 500 / 200。', code: 'BEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nUPDATE accounts SET balance = balance + 100 WHERE id = 2;\nINSERT INTO entries VALUES (1, 99); -- 冲突\nROLLBACK;', explanation: '错误令显式事务进入中止状态；ROLLBACK 撤销两次成功的 UPDATE。', comparison: '没有 BEGIN 时，语句各自提交，无法将三步一并回滚。' },
  { key: 'savepoint', title: 'SAVEPOINT 局部回退', subtitle: '只撤销保存点之后的工作', question: '保存点后插入商品 10，再发生主键冲突；商品 10 会留下吗？', expected: '商品 10 被回退，之后插入的商品 11 随外层事务提交。', code: 'BEGIN;\nSAVEPOINT before_items;\nINSERT INTO entries VALUES (2, 10);\nINSERT INTO entries VALUES (1, 99); -- 冲突\nROLLBACK TO SAVEPOINT before_items;\nINSERT INTO entries VALUES (3, 11);\nCOMMIT;', explanation: 'ROLLBACK TO 会撤销保存点之后的所有修改，包括成功的插入。', comparison: '保存点不是真正的嵌套事务，最终仍由外层 COMMIT 决定。' },
  { key: 'read-committed', title: 'READ COMMITTED', subtitle: '每条语句获得新快照', question: 'A 先读库存 10，B 改成 9 并提交；A 再读是多少？', expected: '10 → 9；这是不可重复读，不是脏读。', code: 'A: BEGIN ISOLATION LEVEL READ COMMITTED;\nA: SELECT stock; -- 10\nB: UPDATE stock = 9; -- 已提交\nA: SELECT stock; -- 9', explanation: 'A 的第二条 SELECT 得到新快照，看到 B 已提交的行版本。', comparison: 'REPEATABLE READ 在事务内复用首次查询建立的快照。' },
  { key: 'repeatable-read', title: 'REPEATABLE READ', subtitle: '事务内稳定读取', question: '同样顺序下，B 提交后 A 第二次还会读到 10 吗？', expected: 'A 两次都读到 10；提交后的新查询读到 9。', code: 'A: BEGIN ISOLATION LEVEL REPEATABLE READ;\nA: SELECT stock; -- 建立快照：10\nB: UPDATE stock = 9; -- 已提交\nA: SELECT stock; -- 仍为 10', explanation: 'BEGIN 本身不固定数据快照；首次查询建立快照，之后的普通查询复用它。', comparison: '稳定快照不能自动保护跨行约束，见写偏斜。' },
  { key: 'write-skew', title: '写偏斜', subtitle: '跨行规则仍可能被破坏', question: '两位医生各看到 2 人值班，分别让自己下班；最后还有人吗？', expected: 'REPEATABLE READ 下两边都可能提交，最终为 0 人。', code: 'A/B: BEGIN ISOLATION LEVEL REPEATABLE READ;\nA/B: SELECT count(*) WHERE active; -- 各为 2\nA: UPDATE doctor_A SET active = false;\nB: UPDATE doctor_B SET active = false;\nA/B: COMMIT;', explanation: '两个事务修改不同行，却都依赖对方即将改变的旧数据。', comparison: '改用 SERIALIZABLE，再观察同样时序的 40001。' },
  { key: 'serializable', title: 'SERIALIZABLE', subtitle: '拒绝无法串行解释的结果', question: '相同的两次下班请求还能都成功吗？', expected: '一方得到 40001，最终仍有 1 人在岗。', code: 'A/B: BEGIN ISOLATION LEVEL SERIALIZABLE;\nA/B: SELECT count(*) WHERE active; -- 各为 2\nA: UPDATE doctor_A SET active = false;\nB: UPDATE doctor_B SET active = false;\nA/B: COMMIT; -- 一方报 40001', explanation: 'SSI 检测到相互冲突的读写依赖，拒绝不可能串行化的提交。', comparison: '必须从 BEGIN 重新查询和判断，不能只重试失败的 UPDATE。' },
];

const Transactions = () => {
  const [selected, setSelected] = useState(examples[0]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const select = (example: typeof examples[number]) => {
    controller.current?.abort();
    controller.current = null;
    setSelected(example);
    setResult(null);
    setError('');
    setLoading(false);
  };

  const run = async () => {
    controller.current?.abort();
    const current = new AbortController();

    controller.current = current;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await postApiTransactionsRun({ body: { scenario: selected.key }, signal: current.signal });

      if (controller.current === current) { setResult(response.data); }
    } catch (cause) {
      if (controller.current === current && !current.signal.aborted) {
        const message = isAxiosError<TransactionError>(cause) ? cause.response?.data.error : undefined;

        setError(message ?? '请求失败；请确认后端和 study_nodejs 已启动。');
      }
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><Text c="teal" fw={700} size="sm">POSTGRESQL / TRANSACTIONS</Text><Title order={1}>事务实验</Title><Text c="dimmed">在真实数据库中执行，比较事务边界、快照和并发冲突。</Text></div>
          <Group gap="sm"><Badge color="teal" variant="light">6 个场景</Badge><DemoStructureDialog structure={structure} /></Group>
        </header>
        <div className={styles.workspace}>
          <nav aria-label="事务场景" className={styles.navigation}>{examples.map((example) => <button aria-current={selected.key === example.key ? 'true' : undefined} className={`${styles.navItem} ${selected.key === example.key ? styles.active : ''}`} key={example.key} onClick={() => select(example)} type="button"><strong>{example.title}</strong><span>{example.subtitle}</span></button>)}</nav>
          <section aria-label="事务实验" className={styles.detail}>
            <div className={styles.heading}><div><Title order={2}>{selected.title}</Title><Text c="dimmed" size="sm">{selected.subtitle}</Text></div><Badge color="orange" variant="light">POST</Badge></div>
            <div className={styles.lesson}><div><h3>先预测</h3><Text size="sm">{selected.question}</Text></div><div><h3>关键 SQL（简化展示）</h3><pre>{selected.code}</pre></div><div><h3>运行后应看到</h3><Text size="sm">{selected.expected}</Text></div></div>
            <div className={styles.action}><code>POST /api/transactions/run</code><Button leftSection={<IconPlayerPlay size={16} />} loading={loading} onClick={() => void run()}>运行实验</Button></div>
            {error && <Text c="red" role="alert">{error}</Text>}
            {!result && !error && <div className={styles.empty}>{loading ? '正在执行事务…' : '等待运行'}</div>}
            {result && <section aria-live="polite" className={styles.result}>
              <div className={styles.resultHeading}><h3>实际执行</h3><Badge color="teal" variant="light">{result.database}</Badge></div>
              <ol className={styles.timeline}>{result.steps.map((step) => <li key={`${step.session}-${step.action}`}><span className={styles.session}>{step.session}</span><div><strong>{step.action}</strong><p>{step.observation}</p></div>{step.sqlstate && <Badge color="red" variant="light">{step.sqlstate}</Badge>}</li>)}</ol>
              <div className={styles.final}><h3>最终数据</h3><div>{Object.entries(result.final).map(([name, value]) => <span key={name}><small>{name}</small><strong>{value}</strong></span>)}</div></div>
              <div className={styles.explanation}><h3>为什么得到这个结果</h3><Text size="sm">{result.outcome} {selected.explanation}</Text><Text c="dimmed" size="sm">{selected.comparison}</Text></div>
            </section>}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Transactions;
