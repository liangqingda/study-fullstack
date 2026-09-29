import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateApiClient } from './gen-apis.mjs';

const spec = {
  openapi: '3.1.0',
  info: { title: 'Demo', version: '1' },
  paths: {
    '/api/orders/{orderId}': {
      get: {
        parameters: [
          { name: 'orderId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'details', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: { description: 'ok', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] } } } },
          404: { description: 'missing', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } } },
        },
      },
      post: {
        parameters: [{ name: 'orderId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { quantity: { type: 'integer' } }, required: ['quantity'] } } } },
        responses: { 204: { description: 'updated' } },
      },
    },
  },
};

test('generates typed callers for path, query, JSON body, and empty success responses', async () => {
  const { client } = await generateApiClient(spec);

  assert.match(client, /orderId: number/);
  assert.match(client, /export const getApiOrdersOrderId/);
  assert.match(client, /import \{ buildPath, request \} from '@\/utils\/http';/);
  assert.match(client, /query\?: \{\s+details\?: boolean;/);
  assert.match(client, /buildPath\("\/api\/orders\/\{orderId\}", input.path\)/);
  assert.match(client, /body: \{\s+quantity: number;/);
  assert.match(client, /Promise<AxiosResponse<void>>/);
  assert.doesNotMatch(client, /\["responses"\]\["404"\]/);
});

test('imports named payload types from the schema package without a local types module', async () => {
  const { client, types } = await generateApiClient({
    ...spec,
    components: { schemas: { OrderRequest: { type: 'object' }, OrderResponse: { type: 'object' } } },
    paths: {
      '/api/orders': {
        post: {
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderRequest' } } } },
          responses: { 200: { description: 'ok', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderResponse' } } } } },
        },
      },
    },
  });

  assert.equal(types, undefined);
  assert.match(client, /import type \{ OrderRequest, OrderResponse \} from '@liangqingda\/study-nodejs-schema';/);
  assert.match(client, /body: OrderRequest/);
  assert.match(client, /Promise<AxiosResponse<OrderResponse>>/);
  assert.doesNotMatch(client, /paths\[|components\[|from ['"]\.\/types/);
});

test('rejects unsupported success payloads rather than generating wrong response types', async () => {
  await assert.rejects(
    generateApiClient({ ...spec, paths: { '/file': { get: { responses: { 200: { content: { 'text/plain': { schema: { type: 'string' } } } } } } } } }),
    /unsupported non-JSON/,
  );
});

test('preserves nested references and unions of successful responses', async () => {
  const { client } = await generateApiClient({
    ...spec,
    components: { schemas: { Order: { type: 'object' } } },
    paths: {
      '/api/orders': {
        get: {
          responses: {
            200: { description: 'ok', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } },
            204: { description: 'empty' },
          },
        },
      },
    },
  });

  assert.match(client, /import type \{ Order \} from '@liangqingda\/study-nodejs-schema';/);
  assert.match(client, /Promise<AxiosResponse<Order\[\] \| void>>/);
});
