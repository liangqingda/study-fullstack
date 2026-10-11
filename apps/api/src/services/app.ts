import compression from 'compression';
import cors from 'cors';
import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';

import type { Express } from 'express';
import type { AppConfig } from '../consts/config';
import type { PostgresClient } from '../apis/postgres/ping/queries';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

import { errorHandler } from '../middlewares/error-handler';
import errorHandlingRouter from '../apis/express/error-handling';
import middlewareRouter, { applicationMiddleware } from '../apis/express/middleware';
import { createPostgresRouter } from '../apis/postgres/ping';
import responseMethodsRouter from '../apis/express/response-methods';
import { createSmsLoginRouter } from '../apis/redis/sms-login';
import { createTransactionRouter } from '../apis/postgres/transactions';
import { createUrlToPageRouter } from '../apis/http/url-to-page';

export const createApp = (
  config: AppConfig,
  postgres?: PostgresClient & Partial<Pick<Pool, 'connect'>>,
  redis?: Redis,
): Express => {
  const app = express();
  const logger = pino({
    level: config.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.url',
        'err.config.headers.authorization',
        'phone',
      ],
      censor: '[Redacted]',
    },
  });

  app.disable('x-powered-by');
  const jsonParser = express.json();

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (req) => ({ method: req.method }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(
    cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }),
  );
  app.use(compression());
  app.use((req, res, next) => {
    if (req.path === '/api/express/middleware/built-in') {
      next();
      return;
    }

    jsonParser(req, res, next);
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health-check', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/postgres', createPostgresRouter(postgres));
  app.use('/api/redis/sms-login', createSmsLoginRouter(redis));
  app.use(
    '/api/postgres/transactions',
    createTransactionRouter(
      postgres?.connect ? (postgres as Pick<Pool, 'connect'>) : undefined,
    ),
  );
  app.use('/api/express/response-methods', responseMethodsRouter);
  app.use('/api/express/middleware', applicationMiddleware, middlewareRouter);
  app.use('/api/express/error-handling', errorHandlingRouter);
  app.use('/api/http/url-to-page', createUrlToPageRouter());
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);

  return app;
};
