/**
 * 一个中间件执行顺序演示用例。
 */
export type Example = {
  /** 用例标识。 */
  key: string;
  /** 用例名称。 */
  name: string;
  /** 一句话摘要。 */
  summary: string;
  /** 机制讲解。 */
  explanation: string;
  /** 执行步骤。 */
  steps: string[];
  /** 后端示例代码。 */
  code: string;
  /** 观察到的执行顺序。 */
  observation: string;
  /** 现象解释。 */
  interpretation: string;
  /** 与其他写法的对比。 */
  comparison: string;
  /** 请求方法。 */
  method: 'GET' | 'POST';
};

/**
 * 后端返回的中间件执行轨迹。
 */
export type DemoResponse = {
  /** 响应类型标识。 */
  kind: string;
  /** 中间件执行顺序的日志数组。 */
  trace: string[];
  /** 额外消息。 */
  message?: string;
  /** 接收到的请求体。 */
  received?: unknown;
};
