import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';

import * as apis from '../apis';
import { HttpMethodEnum, type ApiInfo } from '../apis/model/api-info';

function isApiInfo(value: unknown): value is ApiInfo {
  if (typeof value !== 'object' || value === null) {return false;}

  const candidate = value as Partial<ApiInfo>;

  return Object.values(HttpMethodEnum).some((method) => method === candidate.method)
    && typeof candidate.path === 'string' && candidate.response !== undefined;
}

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
});

for (const value of Object.values(apis)) {
  if (!isApiInfo(value)) {continue;}

  registry.registerPath({
    method: value.method,
    path: value.path,
    summary: value.summary,
    tags: value.tags,
    security: value.requiresAuth ? [{ bearerAuth: [] }] : undefined,
    request: {
      query: value.query,
      params: value.params,
      body: value.body ? { required: value.bodyRequired ?? true, content: { 'application/json': { schema: value.body } } } : undefined,
    },
    responses: {
      [value.responseStatus ?? 200]: {
        description: 'Successful response',
        content: { 'application/json': { schema: value.response } },
      },
      ...Object.fromEntries(Object.entries(value.errorResponses ?? {}).map(([status, schema]) => [status, {
        description: 'Error response',
        content: { 'application/json': { schema } },
      }])),
    },
  });
}

const { version } = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as { version: string };
const document = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: '3.1.0',
  info: { title: 'Study Node.js API', version },
});
const output = resolve(__dirname, '../openApiJsonFile.json');
const content = `${JSON.stringify(document, null, 2)}\n`;

writeFileSync(output, content);
console.info(`Generated OpenAPI 3.1 document: ${output}`);
