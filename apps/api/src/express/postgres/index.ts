import { Router } from 'express';
import { z } from 'zod';

import type { Router as ExpressRouter } from 'express';
import type { PostgresClient } from './queries';

import { pingPostgres } from './queries';

const PING_QUERY = z.object({ value: z.string().trim().min(1).max(100) });

export const createPostgresRouter = (client?: PostgresClient): ExpressRouter => {
  const router: ExpressRouter = Router();

  router.get('/ping', async (req, res) => {
    if (!client) {
      console.info('[postgres/ping] skipped: DATABASE_URL is not configured');
      res.status(503).json({ error: 'PostgreSQL is not configured' });
      return;
    }

    const input = PING_QUERY.safeParse(req.query);

    if (!input.success) {
      console.info('[postgres/ping] invalid value');
      res.status(400).json({ error: 'value must be 1-100 characters' });
      return;
    }

    try {
      console.info('[postgres/ping] running parameterized SELECT');
      const result = await pingPostgres(client, input.data.value);

      console.info(`[postgres/ping] success: database=${result.database}`);
      res.json(result);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? 'unknown';

      console.error(`[postgres/ping] query failed (${code})`);
      res.status(503).json({ error: 'PostgreSQL is unavailable' });
    }
  });

  return router;
};
