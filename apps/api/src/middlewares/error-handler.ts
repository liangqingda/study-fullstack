import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  // Only expose known parser errors, never arbitrary exception messages/statuses.
  const parserError = error instanceof Error && 'type' in error ? error.type : undefined;
  const parserResponses: Record<string, { status: number; message: string }> = {
    'entity.parse.failed': { status: 400, message: 'Malformed JSON' },
    'entity.too.large': { status: 413, message: 'Request body too large' },
    'encoding.unsupported': { status: 415, message: 'Unsupported content encoding' },
    'charset.unsupported': { status: 415, message: 'Unsupported charset' },
    'request.aborted': { status: 400, message: 'Request aborted' },
    'request.size.invalid': { status: 400, message: 'Invalid request size' },
  };
  const response = typeof parserError === 'string' && Object.prototype.hasOwnProperty.call(parserResponses, parserError)
    ? parserResponses[parserError]!
    : { status: 500, message: 'Internal server error' };

  if (response.status === 500) {
    req.log.error({ err: error }, 'Unhandled request error');
  }

  res.status(response.status).json({ error: response.message });
};
