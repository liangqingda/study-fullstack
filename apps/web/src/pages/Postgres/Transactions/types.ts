import type { postApiTransactionsRun } from '@/apis';

export type Scenario = Parameters<typeof postApiTransactionsRun>[0]['body']['scenario'];

export type Result = Awaited<ReturnType<typeof postApiTransactionsRun>>['data'];

export type Example = {
  key: Scenario;
  title: string;
  subtitle: string;
  question: string;
  expected: string;
  code: string;
  explanation: string;
  comparison: string;
};
