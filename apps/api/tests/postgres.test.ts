import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { readConfig } from '../src/consts/config';
import { createApp } from '../src/services/app';

const config = readConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' });

describe('PostgreSQL ping', () => {
  it('does not connect when the database is not configured', async () => {
    const response = await request(createApp(config)).get('/api/postgres/ping?value=hello');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'PostgreSQL is not configured' });
  });

  it('binds validated input as a SQL parameter and returns the database result', async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [{ database: 'learning', echoed: "x'; DROP TABLE users; --" }] });
    const app = createApp(config, { query });
    const response = await request(app)
      .get('/api/postgres/ping')
      .query({ value: " x'; DROP TABLE users; -- " });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ database: 'learning', echoed: "x'; DROP TABLE users; --" });
    expect(query).toHaveBeenCalledWith(
      'SELECT current_database() AS database, $1::text AS echoed',
      ["x'; DROP TABLE users; --"],
    );
  });

  it('rejects invalid input without querying', async () => {
    const query = vi.fn();
    const app = createApp(config, { query });
    const response = await request(app).get('/api/postgres/ping?value=');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'value must be 1-100 characters' });
    expect(query).not.toHaveBeenCalled();
  });

  it('returns a sanitized 503 when PostgreSQL is unavailable', async () => {
    const query = vi.fn().mockRejectedValue(new Error('connection details must not be exposed'));
    const app = createApp(config, { query });
    const response = await request(app).get('/api/postgres/ping?value=hello');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'PostgreSQL is unavailable' });
    expect(JSON.stringify(response.body)).not.toContain('connection details');
  });
});
