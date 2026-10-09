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

export type DemoResponse = {
  kind: string;
  trace: string[];
  message?: string;
  received?: unknown;
};
