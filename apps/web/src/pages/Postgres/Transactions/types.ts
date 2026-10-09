import type { postApiTransactionsRun } from '@/apis';

/**
 * 事务演示场景类型，直接从后端契约推断。
 */
export type Scenario = Parameters<typeof postApiTransactionsRun>[0]['body']['scenario'];

/**
 * 后端事务运行结果。
 */
export type Result = Awaited<ReturnType<typeof postApiTransactionsRun>>['data'];

/**
 * 一个事务演示场景的教学数据。
 */
export type Example = {
  /** 场景标识，与后端 scenario 枚举对应。 */
  key: Scenario;
  /** 场景标题。 */
  title: string;
  /** 副标题。 */
  subtitle: string;
  /** 要观察的问题。 */
  question: string;
  /** 预期结果。 */
  expected: string;
  /** SQL 示例代码。 */
  code: string;
  /** 机制讲解。 */
  explanation: string;
  /** 与其他隔离级别的对比。 */
  comparison: string;
};
