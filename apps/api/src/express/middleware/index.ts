import express, { Router } from 'express';
import morgan from 'morgan';

import type { ErrorRequestHandler, RequestHandler, Response, Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

const trace = (res: Response): string[] => res.locals.trace as string[];

const record = (res: Response, step: string) => {
  const { locals } = res;

  locals.trace = [...trace(res), step];
};

export const applicationMiddleware: RequestHandler = (req, res, next) => {
  const { locals } = res;

  locals.trace = ['app.use: 应用级中间件进入'];
  res.once('finish', () => {
    console.info(`[middleware] ${req.method} ${req.baseUrl}${req.path} -> ${res.statusCode} | ${trace(res).join(' -> ')}`);
  });
  next();
};

router.get('/application', (_req, res) => {
  record(res, 'app 路由处理器: 发送响应');
  res.json({ kind: 'application', trace: trace(res) });
});

router.use('/router', (_req, res, next) => {
  record(res, 'router.use: 路由级中间件进入');
  next();
});

router.get('/router', (_req, res) => {
  record(res, 'router.get: 路由处理器发送响应');
  res.json({ kind: 'router', trace: trace(res) });
});

router.get('/error', (_req, res, next) => {
  record(res, '路由处理器: next(error)');
  next(new Error('演示用错误：由错误处理中间件统一响应'));
});

router.post('/built-in', express.json(), (req, res) => {
  record(res, 'express.json: 已解析 JSON 请求体');
  res.json({ kind: 'built-in', received: req.body, trace: trace(res) });
});

// immediate 让日志在响应前产生，这样页面也能观察到执行顺序。
router.use('/third-party', morgan((tokens, req, res) => {
  record(res as Response, 'morgan: 第三方日志中间件记录请求');
  return `middleware demo ${tokens.method?.(req, res) ?? req.method} ${req.url?.split('?')[0] ?? '/'}`;
}, { immediate: true }));

router.get('/third-party', (_req, res) => {
  record(res, 'router.get: 路由处理器发送响应');
  res.json({ kind: 'third-party', trace: trace(res) });
});

const handleError: ErrorRequestHandler = (error: Error & { status?: number }, _req, res, _next) => {
  record(res, '错误处理中间件: 捕获错误并响应');
  res.status(error.status ?? 500).json({
    kind: 'error',
    message: error.status === 400 ? 'JSON 格式错误' : error.message,
    trace: trace(res),
  });
};

router.use(handleError);

export default router;
