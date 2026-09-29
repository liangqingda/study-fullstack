/* eslint-disable */
// Generated from study-nodejs-schema. Do not edit.
import type { AxiosResponse } from 'axios';
import type { TransactionRunRequest, TransactionRunResponse } from '@liangqingda/study-nodejs-schema';
import { request } from '@/utils/http';

export const postApiTransactionsRun = (input: { body: TransactionRunRequest; signal?: AbortSignal }): Promise<AxiosResponse<TransactionRunResponse>> =>
  request<TransactionRunResponse>({ method: "POST", url: "/api/transactions/run", data: input.body, signal: input.signal });
