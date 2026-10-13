/**
 * 一个错误处理演示用例的完整定义。
 */
export type Example = {
  /** URL 路径段。 */
  slug: string;
  /** 用例标题。 */
  title: string;
  /** 副标题或场景说明。 */
  subtitle: string;
  /** 这个用例要演示什么错误。 */
  purpose: string;
  /** 执行步骤描述。 */
  steps: string[];
  /** 后端示例代码。 */
  code: string;
  /** 观察到的响应。 */
  observation: string;
  /** 现象解释。 */
  interpretation: string;
  /** 与正确做法的对比。 */
  comparison: string;
};

/**
 * 一次请求后返回给前端的响应摘要。
 */
export type Result = {
  /** HTTP 状态码。 */
  status: number;
  /** 状态码描述文本。 */
  statusText: string;
  /** 响应 Content-Type。 */
  contentType: string;
  /** 后端自定义响应头的值。 */
  demoHeader: string;
  /** 响应体文本。 */
  body: string;
};
