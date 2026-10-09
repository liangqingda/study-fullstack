/** 一个错误处理演示用例的完整定义。 */
export type Example = {
  slug: string;
  title: string;
  subtitle: string;
  purpose: string;
  steps: string[];
  code: string;
  observation: string;
  interpretation: string;
  comparison: string;
};

/** 一次请求后返回给前端的响应摘要。 */
export type Result = {
  status: number;
  statusText: string;
  contentType: string;
  demoHeader: string;
  body: string;
};
