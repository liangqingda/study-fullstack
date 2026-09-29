import { randomInt, randomUUID } from 'node:crypto';

import type { Pool, PoolClient } from 'pg';
import type { z } from 'zod';
import type { TransactionRunRequestSchema, TransactionRunResponseSchema } from '@liangqingda/study-nodejs-schema/apis';

type Scenario = z.infer<typeof TransactionRunRequestSchema>['scenario'];
type Result = z.infer<typeof TransactionRunResponseSchema>;
type Step = Result['steps'][number];
type Client = Pick<PoolClient, 'query' | 'release'>;

const errorCode = (error: unknown): string => (error as { code?: string }).code ?? 'unknown';

const assertDatabase = async (client: Client) => {
  const { rows } = await client.query<{ database: string }>('SELECT current_database() AS database');

  if (rows[0]?.database !== 'study_nodejs') {
    throw new Error('Transaction demos require study_nodejs');
  }
};

const add = (steps: Step[], session: string, action: string, observation: string, sqlstate?: string) => {
  // Ordered trace is local to this request and never shared with another transaction.
  // eslint-disable-next-line no-restricted-syntax
  steps.push({ session, action, observation, ...(sqlstate ? { sqlstate } : {}) });
  console.info(`[transactions] ${session}: ${action} -> ${observation}${sqlstate ? ` (${sqlstate})` : ''}`);
};

const singleConnection = async (client: Client, scenario: Scenario, steps: Step[]): Promise<Pick<Result, 'final' | 'outcome'>> => {
  const savepoint = scenario === 'savepoint';

  try {
    await client.query('CREATE TEMP TABLE demo_transactions_accounts (id integer PRIMARY KEY, balance integer NOT NULL)');
    await client.query('INSERT INTO demo_transactions_accounts VALUES (1, 500), (2, 200)');
    await client.query('CREATE TEMP TABLE demo_transactions_entries (id integer PRIMARY KEY, item integer NOT NULL)');
    await client.query('INSERT INTO demo_transactions_entries VALUES (1, 0)');
    await client.query('BEGIN');

    if (savepoint) {
      await client.query('SAVEPOINT before_items');
      await client.query('INSERT INTO demo_transactions_entries VALUES (2, 10)');
      add(steps, 'A', 'SAVEPOINT 后插入商品 10', '当前事务内可见，尚未提交');
    } else {
      await client.query('UPDATE demo_transactions_accounts SET balance = balance - 100 WHERE id = 1');
      await client.query('UPDATE demo_transactions_accounts SET balance = balance + 100 WHERE id = 2');
      add(steps, 'A', 'BEGIN；扣 A 100、加 B 100', '当前事务内余额为 400 / 300');
    }

    try {
      await client.query('INSERT INTO demo_transactions_entries VALUES (1, 99)');
      throw new Error('Expected a primary-key violation');
    } catch (error) {
      if (errorCode(error) !== '23505') { throw error; }

      add(steps, 'A', '重复插入主键 1', '唯一约束失败，事务进入中止状态', '23505');
    }

    if (!savepoint) {
      try {
        await client.query('SELECT balance FROM demo_transactions_accounts WHERE id = 1');
        throw new Error('Expected aborted transaction state');
      } catch (error) {
        if (errorCode(error) !== '25P02') { throw error; }

        add(steps, 'A', '错误后继续 SELECT', '普通 SQL 被拒绝，必须先回滚', '25P02');
      }

      await client.query('ROLLBACK');
      const { rows } = await client.query<{ id: number; balance: number }>('SELECT id, balance FROM demo_transactions_accounts ORDER BY id');

      add(steps, 'A', 'ROLLBACK 后查询', `${rows[0]?.balance} / ${rows[1]?.balance}，本次转账全部撤销`);

      return { final: { A: rows[0]?.balance ?? 0, B: rows[1]?.balance ?? 0 }, outcome: '失败后的 ROLLBACK 撤销两次 UPDATE；原始余额仍为 500 / 200。' };
    }

    await client.query('ROLLBACK TO SAVEPOINT before_items');
    add(steps, 'A', 'ROLLBACK TO SAVEPOINT', '商品 10 与失败语句一并撤销，保存点之前的工作保留');
    await client.query('INSERT INTO demo_transactions_entries VALUES (3, 11)');
    await client.query('RELEASE SAVEPOINT before_items');
    await client.query('COMMIT');
    const { rows } = await client.query<{ item: number }>('SELECT item FROM demo_transactions_entries WHERE id <> 1 ORDER BY id');

    add(steps, 'A', '插入商品 11；COMMIT 后查询', `仅留下商品 ${rows[0]?.item}`);

    return { final: { item10: 0, item11: rows.length }, outcome: '保存点之后成功的商品 10 也被回退；外层 COMMIT 只保留商品 11。' };
  } finally {
    await client.query('ROLLBACK');
    await client.query('DROP TABLE IF EXISTS pg_temp.demo_transactions_entries');
    await client.query('DROP TABLE IF EXISTS pg_temp.demo_transactions_accounts');
  }
};

const snapshot = async (a: Client, b: Client, scenario: Scenario, steps: Step[]): Promise<Pick<Result, 'final' | 'outcome'>> => {
  const id = randomInt(100_000_000, 2_000_000_000);
  const level = scenario === 'read-committed' ? 'READ COMMITTED' : 'REPEATABLE READ';
  let seeded = false;

  try {
    await a.query('CREATE TABLE IF NOT EXISTS demo_transactions_stock (id integer PRIMARY KEY, stock integer NOT NULL CHECK (stock >= 0))');
    const inserted = await a.query('INSERT INTO demo_transactions_stock VALUES ($1, 10) ON CONFLICT DO NOTHING RETURNING id', [id]);

    if (inserted.rowCount !== 1) { throw new Error('Demo row collision; retry the request'); }

    seeded = true;
    await a.query(`BEGIN ISOLATION LEVEL ${level}`);
    const first = (await a.query<{ stock: number }>('SELECT stock FROM demo_transactions_stock WHERE id = $1', [id])).rows[0]?.stock ?? 0;

    add(steps, 'A', `BEGIN ${level}；首次 SELECT`, `库存 ${first}；此时建立快照`);
    await b.query('UPDATE demo_transactions_stock SET stock = 9 WHERE id = $1', [id]);
    add(steps, 'B', 'UPDATE stock = 9（自动提交）', '另一个连接已提交，新行版本可见');
    const second = (await a.query<{ stock: number }>('SELECT stock FROM demo_transactions_stock WHERE id = $1', [id])).rows[0]?.stock ?? 0;

    add(steps, 'A', '同一事务再次 SELECT', `库存 ${second}`);
    await a.query('COMMIT');
    const after = (await a.query<{ stock: number }>('SELECT stock FROM demo_transactions_stock WHERE id = $1', [id])).rows[0]?.stock ?? 0;

    add(steps, 'A', '提交后新事务查询', `库存 ${after}`);

    return { final: { first, second, afterCommit: after }, outcome: level === 'READ COMMITTED' ? '每条语句获取新快照，第二次读到 9（不可重复读）。' : '事务内复用稳定快照，两次都读到 10；提交后读到 9。' };
  } finally {
    await a.query('ROLLBACK');

    if (seeded) { await b.query('DELETE FROM demo_transactions_stock WHERE id = $1', [id]); }
  }
};

const writeSkew = async (a: Client, b: Client, scenario: Scenario, steps: Step[]): Promise<Pick<Result, 'final' | 'outcome'>> => {
  const tag = randomUUID();
  const doctors = [`${tag}-A`, `${tag}-B`];
  const level = scenario === 'serializable' ? 'SERIALIZABLE' : 'REPEATABLE READ';
  let seeded = false;

  try {
    await a.query('CREATE TABLE IF NOT EXISTS demo_transactions_on_call (doctor text PRIMARY KEY, active boolean NOT NULL)');
    await a.query('INSERT INTO demo_transactions_on_call VALUES ($1, true), ($2, true)', doctors);
    seeded = true;
    await a.query(`BEGIN ISOLATION LEVEL ${level}`);
    await b.query(`BEGIN ISOLATION LEVEL ${level}`);

    const query = 'SELECT count(*)::int AS count FROM demo_transactions_on_call WHERE active AND doctor = ANY($1::text[])';
    const aCount = (await a.query<{ count: number }>(query, [doctors])).rows[0]?.count;

    add(steps, 'A', '读取值班人数', `${aCount} 人；认为另一人仍在岗`);
    const bCount = (await b.query<{ count: number }>(query, [doctors])).rows[0]?.count;

    add(steps, 'B', '读取值班人数', `${bCount} 人；认为另一人仍在岗`);

    await a.query('UPDATE demo_transactions_on_call SET active = false WHERE doctor = $1', [doctors[0]]);
    add(steps, 'A', '修改医生 A', '只写入自己的行');
    let bFailed = false;

    try {
      await b.query('UPDATE demo_transactions_on_call SET active = false WHERE doctor = $1', [doctors[1]]);
      add(steps, 'B', '修改医生 B', '只写入另一行');
    } catch (error) {
      if (errorCode(error) !== '40001') { throw error; }

      bFailed = true;
      add(steps, 'B', 'UPDATE', '序列化冲突；须从 BEGIN 重试', '40001');
      await b.query('ROLLBACK');
    }

    await a.query('COMMIT');
    add(steps, 'A', 'COMMIT', '提交成功');

    if (!bFailed) {
      try {
        await b.query('COMMIT');
        add(steps, 'B', 'COMMIT', '提交成功');
      } catch (error) {
        if (errorCode(error) !== '40001') { throw error; }

        add(steps, 'B', 'COMMIT', '序列化冲突；整个事务须重新读取、判断并重试', '40001');
        await b.query('ROLLBACK');
      }
    }

    const active = (await a.query<{ count: number }>('SELECT count(*)::int AS count FROM demo_transactions_on_call WHERE active AND doctor = ANY($1::text[])', [doctors])).rows[0]?.count ?? 0;

    add(steps, '新事务', '查询最终值班人数', `${active} 人`);

    return { final: { active }, outcome: scenario === 'serializable' ? 'SSI 拒绝无法串行解释的写偏斜；失败方重试时应读到 1 并放弃下班。' : '稳定快照没有保护跨行约束；两个事务修改不同行都提交，最终无人值班。' };
  } finally {
    await Promise.all([a.query('ROLLBACK'), b.query('ROLLBACK')]);

    if (seeded) { await a.query('DELETE FROM demo_transactions_on_call WHERE doctor = ANY($1::text[])', [doctors]); }
  }
};

export const runTransaction = async (pool: Pick<Pool, 'connect'>, scenario: Scenario): Promise<Result> => {
  const a = await pool.connect();
  let b: PoolClient | undefined;
  const steps: Step[] = [];

  try {
    await assertDatabase(a);
    console.info(`[transactions/${scenario}] database confirmed: study_nodejs`);

    if (scenario !== 'atomicity' && scenario !== 'savepoint') {
      b = await pool.connect();
      await assertDatabase(b);
    }

    let result: Pick<Result, 'final' | 'outcome'>;

    if (scenario === 'atomicity' || scenario === 'savepoint') {
      result = await singleConnection(a, scenario, steps);
    } else if (scenario === 'read-committed' || scenario === 'repeatable-read') {
      result = await snapshot(a, b!, scenario, steps);
    } else {
      result = await writeSkew(a, b!, scenario, steps);
    }

    return { scenario, database: 'study_nodejs', steps, ...result };
  } finally {
    b?.release();
    a.release();
  }
};
