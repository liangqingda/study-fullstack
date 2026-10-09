/** 一个中间件执行顺序演示用例。 */
export type Example = {
  key: string;
  name: string;
  summary: string;
  explanation: string;
  steps: string[];
  code: string;
  observation: string;
  interpretation: string;
  comparison: string;
  method: 'GET' | 'POST';
};

/** 后端返回的中间件执行轨迹。 */
export type DemoResponse = {
  kind: string;
  trace: string[];
  message?: string;
  received?: unknown;
};
