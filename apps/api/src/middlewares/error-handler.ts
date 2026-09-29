import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const isMalformedJson = error instanceof SyntaxError && 'body' in error;
  const status = isMalformedJson ? 400 : 500;

  if (status === 500) {
    req.log.error({ err: error }, 'Unhandled request error');
  }

  res.status(status).json({ error: isMalformedJson ? 'Malformed JSON' : 'Internal server error' });
};
