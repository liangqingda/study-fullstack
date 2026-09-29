import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { readConfig } from '../src/consts/config';
import { createApp } from '../src/services/app';

const app = createApp(readConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }));

describe('application routes', () => {
  it('responds to health checks and unknown routes', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
    expect((await request(app).get('/health-check')).body).toEqual({ status: 'ok' });
    expect((await request(app).get('/unknown')).status).toBe(404);
  });

  it('keeps existing learning routes available', async () => {
    expect((await request(app).get('/api/response-methods/json')).status).toBe(200);
    expect((await request(app).get('/api/middleware/application')).status).toBe(200);
    const valid = await request(app).post('/api/middleware/built-in').send({ example: true });
    const invalid = await request(app)
      .post('/api/middleware/built-in')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(valid.body.received).toEqual({ example: true });
    expect(invalid.status).toBe(400);
    expect(invalid.body.trace).toContain('错误处理中间件: 捕获错误并响应');
  });
});
