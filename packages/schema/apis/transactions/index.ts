import { z } from 'zod';

import { defineApiInfo, HttpMethodEnum } from '../model/api-info';

export const TransactionScenarioSchema = z.enum([
  'atomicity', 'savepoint', 'read-committed', 'repeatable-read', 'write-skew', 'serializable',
]).openapi('TransactionScenario');

export const TransactionRunRequestSchema = z.object({
  scenario: TransactionScenarioSchema,
}).openapi('TransactionRunRequest');

export const TransactionStepSchema = z.object({
  session: z.string(),
  action: z.string(),
  observation: z.string(),
  sqlstate: z.string().optional(),
}).openapi('TransactionStep');

export const TransactionRunResponseSchema = z.object({
  scenario: TransactionScenarioSchema,
  database: z.literal('study_nodejs'),
  steps: z.array(TransactionStepSchema),
  final: z.record(z.string(), z.number()),
  outcome: z.string(),
}).openapi('TransactionRunResponse');

export const TransactionErrorSchema = z.object({ error: z.string() }).openapi('TransactionError');

export const runTransactionApi = defineApiInfo({
  method: HttpMethodEnum.POST,
  path: '/api/transactions/run',
  summary: 'Run a PostgreSQL transaction learning scenario',
  tags: ['Transactions'],
  body: TransactionRunRequestSchema,
  response: TransactionRunResponseSchema,
  errorResponses: { 400: TransactionErrorSchema, 503: TransactionErrorSchema },
});
