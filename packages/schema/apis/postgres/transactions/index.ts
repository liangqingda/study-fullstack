import { z } from 'zod';

import { defineApiInfo, HttpMethodEnum } from '../../model/api-info';

/**
 * PostgreSQL 事务教学实验的场景枚举。
 * 覆盖原子性、保存点、隔离级别与写偏斜等概念。
 */
export const TransactionScenarioSchema = z
  .enum([
    'atomicity',
    'savepoint',
    'read-committed',
    'repeatable-read',
    'write-skew',
    'serializable',
  ])
  .openapi('TransactionScenario')
  .describe('PostgreSQL 事务教学场景：原子性、保存点、隔离级别与写偏斜');

/**
 * 运行事务实验的请求体：选择要演示的场景。
 */
export const TransactionRunRequestSchema = z
  .object({
    scenario: TransactionScenarioSchema,
  })
  .openapi('TransactionRunRequest')
  .describe('运行事务实验的请求体，选择要演示的场景');

/**
 * 一次事务执行中的单步记录，用于在结果中按序展示实验过程。
 */
export const TransactionStepSchema = z
  .object({
    /** 执行该步的连接会话标识，如 A / B。 */
    session: z.string().describe('执行该步的连接会话标识，如 A / B'),
    /** 该步执行的 SQL 动作描述。 */
    action: z.string().describe('该步执行的 SQL 动作描述'),
    /** 该步的观察结果说明。 */
    observation: z.string().describe('该步的观察结果说明'),
    /** 触发 PostgreSQL 错误时的 SQLSTATE 码，无错误时缺省。 */
    sqlstate: z
      .string()
      .optional()
      .describe('触发 PostgreSQL 错误时的 SQLSTATE 码，无错误时缺省'),
  })
  .openapi('TransactionStep')
  .describe('一次事务执行中的单步记录');

/**
 * 事务实验的完整响应：场景、最终关键值与逐步执行轨迹。
 */
export const TransactionRunResponseSchema = z
  .object({
    /** 实际运行的场景。 */
    scenario: TransactionScenarioSchema,
    /** 实验固定连接的数据库名。 */
    database: z.literal('study_nodejs').describe('实验固定连接的数据库名'),
    /** 按执行顺序排列的步骤轨迹。 */
    steps: z.array(TransactionStepSchema),
    /** 实验结束时的关键数值，键名因场景而异。 */
    final: z.record(z.string(), z.number()).describe('实验结束时的关键数值'),
    /** 实验结论的文本说明。 */
    outcome: z.string().describe('实验结论的文本说明'),
  })
  .openapi('TransactionRunResponse')
  .describe('事务实验的完整响应：场景、最终关键值与逐步执行轨迹');

/**
 * 事务实验的通用错误响应。
 */
export const TransactionErrorSchema = z
  .object({
    /** 错误信息。 */
    error: z.string().describe('错误信息'),
  })
  .openapi('TransactionError')
  .describe('事务实验的通用错误响应');

/**
 * 运行 PostgreSQL 事务学习场景的 API 契约。
 */
export const runTransactionApi = defineApiInfo({
  method: HttpMethodEnum.POST,
  path: '/api/postgres/transactions/run',
  summary: 'Run a PostgreSQL transaction learning scenario',
  tags: ['Transactions'],
  body: TransactionRunRequestSchema,
  response: TransactionRunResponseSchema,
  errorResponses: { 400: TransactionErrorSchema, 503: TransactionErrorSchema },
});
