// start of generated types
/**
 * 运行事务实验的请求体，选择要演示的场景
 */
export type TransactionRunRequest = {
  /** PostgreSQL 事务教学场景：原子性、保存点、隔离级别与写偏斜 */
  scenario: TransactionScenario;
};

/**
 * PostgreSQL 事务教学场景：原子性、保存点、隔离级别与写偏斜
 */
export type TransactionScenario =
  | 'atomicity'
  | 'savepoint'
  | 'read-committed'
  | 'repeatable-read'
  | 'write-skew'
  | 'serializable';

/**
 * 一次事务执行中的单步记录
 */
export type TransactionStep = {
  /** 执行该步的连接会话标识，如 A / B */
  session: string;
  /** 该步执行的 SQL 动作描述 */
  action: string;
  /** 该步的观察结果说明 */
  observation: string;
  /** 触发 PostgreSQL 错误时的 SQLSTATE 码，无错误时缺省 */
  sqlstate?: string;
};

/**
 * 事务实验的完整响应：场景、最终关键值与逐步执行轨迹
 */
export type TransactionRunResponse = {
  /** PostgreSQL 事务教学场景：原子性、保存点、隔离级别与写偏斜 */
  scenario: TransactionScenario;
  /** 实验固定连接的数据库名 */
  database: 'study_nodejs';
  steps: TransactionStep[];
  /** 实验结束时的关键数值 */
  final: {
    [key: string]: number;
  };
  /** 实验结论的文本说明 */
  outcome: string;
};

/**
 * 事务实验的通用错误响应
 */
export type TransactionError = {
  /** 错误信息 */
  error: string;
};
