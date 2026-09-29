const frontendSources = import.meta.glob<string>([
  '@/pages/Express/**/*.{ts,tsx,scss}',
  '@/pages/Postgres/**/*.{ts,tsx,scss}',
  '@/pages/CssDemos/**/*.{ts,tsx,scss}',
  '@/apis/**/*.{ts,tsx}',
  '@/utils/http/**/*.{ts,tsx}',
], { query: '?raw', import: 'default' });

const backendSources = import.meta.glob<string>([
  '../../../../api/src/services/app.ts',
  '../../../../api/src/middlewares/error-handler.ts',
  '../../../../api/src/express/middleware/**/*.{ts,txt,ejs}',
  '../../../../api/src/express/error-handling/**/*.{ts,txt,ejs}',
  '../../../../api/src/express/response-methods/**/*.{ts,txt,ejs}',
  '../../../../api/src/express/transactions/**/*.{ts,sql}',
], { query: '?raw', import: 'default' });

const schemaSources = import.meta.glob<string>([
  '../../../../../packages/schema/apis/transactions/**/*.ts',
  '../../../../../packages/schema/apis/model/api-info.ts',
], { query: '?raw', import: 'default' });

export const getSourceFile = async (repository: 'frontend' | 'backend' | 'schema', path: string): Promise<string | undefined> => {
  if (repository === 'frontend') {
    const key = `/${path}`;

    return key in frontendSources ? frontendSources[key]() : undefined;
  }

  if (import.meta.env.DEV) {
    const response = await fetch(`${repository === 'schema' ? '/__demo_schema/' : '/__demo_source/'}${path}`);

    if (!response.ok) {
      throw new Error(`Source preview failed: ${response.status}`);
    }

    return response.text();
  }

  if (repository === 'schema') {
    const key = `../../../../../packages/schema/${path}`;

    return key in schemaSources ? schemaSources[key]() : undefined;
  }

  const key = `../../../../api/${path}`;

  return key in backendSources ? backendSources[key]() : undefined;
};
