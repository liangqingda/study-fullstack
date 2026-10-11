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
  const { files, index } = await generateApiClient(spec);
  const orders = files.find((file) => file.name === 'orders.ts')?.content ?? '';

  assert.equal(files.length, 1);
  assert.match(index, /export \* from '\.\/orders';/);
  assert.match(orders, /orderId: number/);
  assert.match(orders, /export const getApiOrdersOrderId/);
  assert.match(orders, /import \{ buildPath, get, post \} from '@\/utils\/http';/);
  assert.match(orders, /query\?: \{\s+details\?: boolean;/);
  assert.match(orders, /buildPath\("\/api\/orders\/\{orderId\}", input.path\)/);
  assert.match(orders, /body: \{\s+quantity: number;/);
  // 便捷方法已声明返回类型，生成的函数省略标注，由 TypeScript 自动推导。
  assert.doesNotMatch(orders, /Promise<AxiosResponse/);
  assert.match(orders, /=>\s+post<void>\(/);
  assert.doesNotMatch(orders, /\["responses"\]\["404"\]/);
});

test('imports named payload types from the schema package without a local types module', async () => {
  const { files } = await generateApiClient({
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
  const orders = files.find((file) => file.name === 'orders.ts')?.content ?? '';

  assert.match(orders, /import type \{ OrderRequest, OrderResponse \} from '@liangqingda\/study-nodejs-schema';/);
  assert.match(orders, /body: OrderRequest/);
  assert.match(orders, /=>\s+post<OrderResponse>\(/);
  assert.doesNotMatch(orders, /paths\[|components\[|from ['"]\.\/types/);
});

test('splits callers into per-demo files, groups them by category, and re-exports from indexes', async () => {
  const { files, categoryIndexes, index } = await generateApiClient({
    ...spec,
    paths: {
      '/api/orders': {
        get: {
          responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
      '/api/users': {
        get: {
          responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
    },
  }, { demoCategories: { orders: 'shop', users: 'identity' } });

  // 有分类的 demo 归入 `category/<demo>.ts`，形成最多两层结构。
  assert.deepEqual(files.map((file) => file.path), ['shop/orders.ts', 'identity/users.ts']);
  assert.deepEqual(categoryIndexes.map((file) => file.path), ['identity/index.ts', 'shop/index.ts']);
  assert.match(categoryIndexes[0].content, /export \* from '\.\/users';/);
  assert.match(categoryIndexes[1].content, /export \* from '\.\/orders';/);
  assert.match(index, /export \* from '\.\/identity';/);
  assert.match(index, /export \* from '\.\/shop';/);
  assert.match(files[0].content, /export const getApiOrders/);
  assert.match(files[1].content, /export const getApiUsers/);
  // 各 demo 文件只 import 自己用到的 http 便捷方法。
  assert.doesNotMatch(files[0].content, /users/);
  assert.doesNotMatch(files[1].content, /orders/);
});

test('falls back to a top-level demo file when no category maps to a demo', async () => {
  const { files, categoryIndexes, index } = await generateApiClient(spec);

  assert.deepEqual(files.map((file) => file.path), ['orders.ts']);
  assert.equal(categoryIndexes.length, 0);
  assert.match(index, /export \* from '\.\/orders';/);
});

test('rejects unsupported success payloads rather than generating wrong response types', async () => {
  await assert.rejects(
    generateApiClient({ ...spec, paths: { '/file': { get: { responses: { 200: { content: { 'text/plain': { schema: { type: 'string' } } } } } } } } }),
    /unsupported non-JSON/,
  );
});

test('preserves nested references and unions of successful responses', async () => {
  const { files } = await generateApiClient({
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
  const orders = files.find((file) => file.name === 'orders.ts')?.content ?? '';

  assert.match(orders, /import type \{ Order \} from '@liangqingda\/study-nodejs-schema';/);
  assert.match(orders, /=>\s+get<Order\[\] \| void>\(/);
});
