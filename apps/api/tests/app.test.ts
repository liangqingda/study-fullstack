import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { readConfig } from '../src/consts/config';
import { createApp } from '../src/services/app';

const app = createApp(readConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }));

describe('application routes', () => {
  it.each([
    { body: '{', headers: {}, status: 400, error: 'Malformed JSON' },
    { body: JSON.stringify({ padding: 'x'.repeat(110_000) }), headers: {}, status: 413, error: 'Request body too large' },
    { body: '{}', headers: { 'Content-Encoding': 'unsupported' }, status: 415, error: 'Unsupported content encoding' },
    { body: '{}', headers: { 'Content-Type': 'application/json; charset=iso-8859-1' }, status: 415, error: 'Unsupported charset' },
  ])('returns safe JSON for parser failures ($status: $error)', async ({ body, headers, status, error }) => {
    const response = await request(app).post('/api/transactions/run')
      .set('Origin', 'http://localhost:5173')
      .set('Content-Type', 'application/json').set(headers).send(body);

    expect(response.status).toBe(status);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ error });
  });

  it('includes CORS headers on parser failures', async () => {
    const corsApp = createApp(readConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', CORS_ORIGINS: 'http://localhost:5173' }));
    const response = await request(corsApp).post('/api/transactions/run')
      .set('Origin', 'http://localhost:5173').set('Content-Type', 'application/json').send('{');

    expect(response.status).toBe(400);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

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
