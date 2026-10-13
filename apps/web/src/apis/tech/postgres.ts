/* eslint-disable */
// Generated from @study-lab/schema. Do not edit.
import type {
  TransactionRunRequest,
  TransactionRunResponse,
} from '@study-lab/schema';
import { post } from '@/utils/http';

export const postApiPostgresTransactionsRun = (input: {
  body: TransactionRunRequest;
  signal?: AbortSignal;
}) =>
  post<TransactionRunResponse>(
    '/api/tech/postgres/transactions/run',
    input.body,
    { signal: input.signal },
  );
