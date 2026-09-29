import { Router } from 'express';
import { TransactionErrorSchema, TransactionRunRequestSchema, TransactionRunResponseSchema } from '@liangqingda/study-nodejs-schema/apis';

import type { Pool } from 'pg';
import type { Router as ExpressRouter } from 'express';

import { runTransaction } from './run';

export const createTransactionRouter = (pool?: Pick<Pool, 'connect'>, execute = runTransaction): ExpressRouter => {
  const router: ExpressRouter = Router();

  router.post('/run', async (req, res) => {
    const input = TransactionRunRequestSchema.safeParse(req.body);

    if (!input.success) {
      console.info('[transactions] invalid scenario');
      res.status(400).json(TransactionErrorSchema.parse({ error: 'Invalid transaction scenario' }));
      return;
    }

    if (!pool) {
      console.info(`[transactions/${input.data.scenario}] DATABASE_URL is not configured`);
      res.status(503).json(TransactionErrorSchema.parse({ error: 'PostgreSQL is not configured' }));
      return;
    }

    try {
      const result = await execute(pool, input.data.scenario);

      console.info(`[transactions/${input.data.scenario}] complete: ${result.outcome}`);
      res.json(TransactionRunResponseSchema.parse(result));
    } catch (error) {
      console.error(`[transactions/${input.data.scenario}] failed: ${(error as { code?: string }).code ?? 'unknown'}`);
      res.status(503).json(TransactionErrorSchema.parse({ error: 'Transaction demo failed; check the database and server logs' }));
    }
  });

  return router;
};
