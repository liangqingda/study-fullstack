import compression from 'compression';
import cors from 'cors';
import express from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';

import type { Express } from 'express';
import type { AppConfig } from '../consts/config';
import type { PostgresClient } from '../express/postgres/queries';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

import { errorHandler } from '../middlewares/error-handler';
import errorHandlingRouter from '../express/error-handling';
import middlewareRouter, { applicationMiddleware } from '../express/middleware';
import { createPostgresRouter } from '../express/postgres';
import responseMethodsRouter from '../express/response-methods';
import { createSmsLoginRouter } from '../express/sms-login';
import { createTransactionRouter } from '../express/transactions';

export const createApp = (config: AppConfig, postgres?: PostgresClient & Partial<Pick<Pool, 'connect'>>, redis?: Redis): Express => {
  const app = express();
  const logger = pino({
    level: config.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.url',
        'err.config.headers.authorization',
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
  app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false }));
  app.use(compression());
  app.use((req, res, next) => {
    if (req.path === '/api/middleware/built-in') {
      next();
      return;
    }

    jsonParser(req, res, next);
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health-check', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/postgres', createPostgresRouter(postgres));
  app.use('/api/sms-login', createSmsLoginRouter(redis));
  app.use('/api/transactions', createTransactionRouter(postgres?.connect ? postgres as Pick<Pool, 'connect'> : undefined));
  app.use('/api/response-methods', responseMethodsRouter);
  app.use('/api/middleware', applicationMiddleware, middlewareRouter);
  app.use('/api/error-handling', errorHandlingRouter);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);

  return app;
};
