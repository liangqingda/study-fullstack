/**
 * Express res 方法演示中，每个 HTTP 方法的教学数据结构。
 */
export type Method = {
  /** 方法名称，如 res.json()。 */
  name: string;
  /** URL 路径段，用于构造请求地址。 */
  slug: string;
  /** 一句话说明这个方法做什么。 */
  description: string;
  /** 使用注意事项或边界。 */
  note: string;
  /** 机制讲解。 */
  explanation: string;
  /** 代码执行步骤的文字描述。 */
  steps: string[];
  /** 后端示例代码。 */
  code: string;
  /** 在页面上观察到的现象。 */
  observation: string;
  /** 现象的解释。 */
  interpretation: string;
  /** 与相近方法的对比。 */
  comparison: string;
};
