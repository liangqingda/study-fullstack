/* eslint-disable */
// Generated from study-nodejs-schema. Do not edit.
import type { TransactionRunRequest, TransactionRunResponse } from '@liangqingda/study-nodejs-schema';
import { post } from '@/utils/http';

export const postApiTransactionsRun = (input: { body: TransactionRunRequest; signal?: AbortSignal }) =>
  post<TransactionRunResponse>("/api/transactions/run", input.body, { signal: input.signal });
