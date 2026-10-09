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

export type Result = {
  status: number;
  statusText: string;
  contentType: string;
  demoHeader: string;
  body: string;
};
