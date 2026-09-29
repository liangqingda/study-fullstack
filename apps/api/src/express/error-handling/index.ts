import { readFile } from 'node:fs';

import { Router } from 'express';

import type { ErrorRequestHandler, Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();

router.use((req, res, next) => {
  const label = `${req.method} ${req.baseUrl}${req.path}`;
  let finished = false;

  console.info(`[error-handling] ${label} -> 开始`);
  res.once('finish', () => {
    finished = true;
    console.info(`[error-handling] ${label} -> HTTP ${res.statusCode}，响应完成`);
  });
  res.once('close', () => {
    if (!finished) {
      console.info(`[error-handling] ${label} -> 连接关闭（响应未完成）`);
    }
  });
  next();
});

router.get('/sync', () => {
  console.info('[error-handling] sync -> 同步 throw');
  throw new Error('同步路由中的演示错误');
});

router.get('/async', async () => {
  console.info('[error-handling] async -> Promise 拒绝，Express 5 自动转交');
  await Promise.reject(new Error('异步路由中的演示错误'));
});

router.get('/callback', (_req, _res, next) => {
  console.info('[error-handling] callback -> readFile 回调调用 next(error)');
  readFile('/express-error-handling-demo-missing-file', (error) => {
    if (error) {
      next(error);
    }
  });
});

router.get('/status', (_req, _res, next) => {
  const error = Object.assign(new Error('无效的演示输入'), {
    status: 422,
    headers: { 'X-Demo-Error': 'validation' },
  });

  console.info('[error-handling] status -> next(error)，status=422，X-Demo-Error=validation');
  next(error);
});

router.get('/custom', (_req, _res, next) => {
  console.info('[error-handling] custom -> next(error)');
  next(new Error('自定义处理器中的演示错误'));
});

router.get('/headers-sent', (_req, res, next) => {
  console.info('[error-handling] headers-sent -> 先写入响应，再 next(error)');
  res.type('text/plain').write('这部分已经写入');
  next(new Error('响应开始后发生的演示错误'));
});

const handleError: ErrorRequestHandler = (error: Error, req, res, next) => {
  if (res.headersSent) {
    console.info('[error-handling] headers-sent -> headersSent=true，交给默认处理器关闭连接');
    next(error);
    return;
  }

  if (req.path === '/custom') {
    console.info('[error-handling] custom -> 自定义四参数处理器返回 JSON');
    res.status(500).json({ handler: 'custom', message: '服务器出错，请稍后重试' });
    return;
  }

  console.info(`[error-handling] ${req.path} -> 自定义处理器不处理，next(error) 交给默认处理器`);
  next(error);
};

router.use(handleError);

export default router;
