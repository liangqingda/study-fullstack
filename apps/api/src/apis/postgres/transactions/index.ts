import { Router } from 'express';
import {
  TransactionErrorSchema,
  TransactionRunRequestSchema,
  TransactionRunResponseSchema,
} from '@liangqingda/study-nodejs-schema/apis';

import type { Pool } from 'pg';
import type { Router as ExpressRouter } from 'express';

import { runTransaction } from './run';
import { loggerFor } from '../../../services/logger';

export const createTransactionRouter = (
  pool?: Pick<Pool, 'connect'>,
  execute = runTransaction,
): ExpressRouter => {
  const router: ExpressRouter = Router();

  router.post('/run', async (req, res) => {
    const log = loggerFor(req);
    const input = TransactionRunRequestSchema.safeParse(req.body);

    if (!input.success) {
      log.info('[transactions] invalid scenario');
      res.status(400).json(
        TransactionErrorSchema.parse({
          error: 'Invalid transaction scenario',
        }),
      );
      return;
    }

    if (!pool) {
      log.info(
        `[transactions/${input.data.scenario}] DATABASE_URL is not configured`,
      );
      res.status(503).json(
        TransactionErrorSchema.parse({
          error: 'PostgreSQL is not configured',
        }),
      );
      return;
    }

    try {
      const result = await execute(pool, input.data.scenario);

      log.info(
        { scenario: input.data.scenario, outcome: result.outcome },
        `[transactions/${input.data.scenario}] complete`,
      );
      res.json(TransactionRunResponseSchema.parse(result));
    } catch (error) {
      const code = (error as { code?: string }).code ?? 'unknown';

      log.error(
        { scenario: input.data.scenario, code },
        `[transactions/${input.data.scenario}] failed`,
      );
      res.status(503).json(
        TransactionErrorSchema.parse({
          error: 'Transaction demo failed; check the database and server logs',
        }),
      );
    }
  });

  return router;
};
