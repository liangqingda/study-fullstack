/** Express res 方法演示中，每个 HTTP 方法的教学数据结构。 */
export type Method = {
  name: string;
  slug: string;
  description: string;
  note: string;
  explanation: string;
  steps: string[];
  code: string;
  observation: string;
  interpretation: string;
  comparison: string;
};
