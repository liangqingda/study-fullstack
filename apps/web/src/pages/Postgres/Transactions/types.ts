import type { postApiTransactionsRun } from '@/apis';

/** 事务演示场景类型，直接从后端契约推断。 */
export type Scenario = Parameters<typeof postApiTransactionsRun>[0]['body']['scenario'];

/** 后端事务运行结果。 */
export type Result = Awaited<ReturnType<typeof postApiTransactionsRun>>['data'];

/** 一个事务演示场景的教学数据。 */
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
