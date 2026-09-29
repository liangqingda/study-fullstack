import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import type { Pool } from 'pg';

import { createTransactionRouter } from '../src/express/transactions';
import { runTransaction } from '../src/express/transactions/run';

const appWith = (pool?: Pick<Pool, 'connect'>, execute = runTransaction) => {
  const app = express();

  app.use(express.json());
  app.use('/api/transactions', createTransactionRouter(pool, execute));

  return app;
};

describe('transaction API', () => {
  it('rejects invalid scenarios before acquiring a connection', async () => {
    const execute = vi.fn<typeof runTransaction>();
    const response = await request(appWith(undefined, execute)).post('/api/transactions/run').send({ scenario: 'other' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid transaction scenario' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('reports a missing database without running the scenario', async () => {
    const execute = vi.fn<typeof runTransaction>();
    const response = await request(appWith(undefined, execute)).post('/api/transactions/run').send({ scenario: 'atomicity' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'PostgreSQL is not configured' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns a schema-validated trace for the requested scenario', async () => {
    const pool = { connect: vi.fn() } as unknown as Pick<Pool, 'connect'>;
    const execute = vi.fn<typeof runTransaction>().mockResolvedValue({
      scenario: 'atomicity', database: 'study_nodejs',
      steps: [{ session: 'A', action: 'ROLLBACK', observation: '余额恢复', sqlstate: '23505' }],
      final: { A: 500, B: 200 }, outcome: '全部撤销',
    });
    const response = await request(appWith(pool, execute)).post('/api/transactions/run').send({ scenario: 'atomicity' });

    expect(response.status).toBe(200);
    expect(response.body.final).toEqual({ A: 500, B: 200 });
    expect(response.body.steps[0].sqlstate).toBe('23505');
    expect(execute).toHaveBeenCalledWith(pool, 'atomicity');
  });

  it('sanitizes database failures', async () => {
    const pool = { connect: vi.fn() } as unknown as Pick<Pool, 'connect'>;
    const execute = vi.fn<typeof runTransaction>().mockRejectedValue(new Error('private connection detail'));
    const response = await request(appWith(pool, execute)).post('/api/transactions/run').send({ scenario: 'savepoint' });

    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toContain('private connection detail');
  });
});
