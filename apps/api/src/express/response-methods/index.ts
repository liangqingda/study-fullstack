import { resolve } from 'node:path';

import { Router } from 'express';

import type { Response, Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();
// 非 TS 资源保留在 src 中，开发态和 build 中的模块都指向同一份文件。
const demoRoot = resolve(process.cwd(), 'src/express/response-methods');
const sampleFile = resolve(demoRoot, 'assets/response-demo.txt');
const viewFile = resolve(demoRoot, 'views/response-demo.ejs');

const logResponse = (res: Response, method: string, observation: string) => {
  res.once('finish', () => {
    const contentType = res.getHeader('content-type') ?? 'none';
    const location = res.getHeader('location');
    const disposition = res.getHeader('content-disposition');
    const headers = [
      `Content-Type=${contentType}`,
      ...(location ? [`Location=${location}`] : []),
      ...(disposition ? [`Content-Disposition=${disposition}`] : []),
    ];

    console.info(`[response-methods] ${method}: ${observation} | HTTP ${res.statusCode} | ${headers.join(', ')}`);
  });
};

router.get('/download', (_req, res) => {
  logResponse(res, 'res.download()', '以附件形式发送示例文件');
  res.download(sampleFile, 'express-download-demo.txt');
});

router.get('/end', (_req, res) => {
  logResponse(res, 'res.end()', '结束响应，不发送响应体');
  res.status(204).end();
});

router.get('/json', (_req, res) => {
  logResponse(res, 'res.json()', '序列化对象并返回 JSON');
  res.json({ method: 'res.json()', message: '这是一个 JSON 响应', items: ['Express', 'React'] });
});

router.get('/jsonp', (_req, res) => {
  logResponse(res, 'res.jsonp()', '使用回调包装 JSON（仅示例）');
  res.jsonp({ method: 'res.jsonp()', message: '这是一个 JSONP 响应' });
});

router.get('/redirect', (_req, res) => {
  logResponse(res, 'res.redirect()', '返回 302，指向 JSON 示例');
  res.redirect(302, '/api/response-methods/json');
});

router.get('/render', (_req, res) => {
  logResponse(res, 'res.render()', '使用 EJS 渲染 HTML');
  res.render(viewFile, {
    title: 'res.render() 模板响应',
    message: '这段 HTML 由 Express 使用 EJS 模板渲染。',
  });
});

router.get('/send', (_req, res) => {
  logResponse(res, 'res.send()', '发送纯文本');
  res.type('text/plain').send('res.send() 可以发送字符串、Buffer 或对象。');
});

router.get('/send-file', (_req, res) => {
  logResponse(res, 'res.sendFile()', '直接发送示例文件');
  res.sendFile(sampleFile);
});

router.get('/send-status', (_req, res) => {
  logResponse(res, 'res.sendStatus()', '发送状态码和状态文字');
  res.sendStatus(418);
});

export default router;
