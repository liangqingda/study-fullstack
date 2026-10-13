import { STATUS_CODES, request as httpRequest } from 'node:http';
import { lookup as dnsLookup } from 'node:dns';
import { request as httpsRequest } from 'node:https';
import { performance } from 'node:perf_hooks';
import { URL } from 'node:url';

import { Router } from 'express';
import {
  LoadErrorSchema,
  LoadPhaseSchema,
  LoadRequestSchema,
  LoadResponseSchema,
} from '@study-lab/schema/apis';

import type { RequestOptions } from 'node:http';
import type { Router as ExpressRouter, Request } from 'express';

import { loggerFor } from '../../../../services/logger';

/** 阶段 key 的合法集合，与契约中的 enum 保持一致。 */
type PhaseKey = 'url' | 'dns' | 'tcp' | 'tls' | 'request' | 'wait' | 'body';

/** 单个阶段的构造入参。 */
type PhaseInput = {
  key: PhaseKey;
  label: string;
  durationMs: number;
  note: string;
};

/** 加载结果：成功或失败（失败携带错误文案与已完成阶段）。 */
type LoadOutcome =
  | { ok: true; data: unknown }
  | { ok: false; error: string; reached: ReturnType<typeof LoadPhaseSchema.parse>[] };

/** 最大收集的响应体预览字节数，避免拉取过大页面。 */
const BODY_PREVIEW_LIMIT = 2048;
/** 请求超时（毫秒）：DNS、连接或响应过慢时终止链路。 */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * 构造一个契约校验通过的链路阶段对象。
 */
const phase = (input: PhaseInput) => LoadPhaseSchema.parse(input);

/**
 * 把 Node 网络错误翻译成面向学习者的中文提示。
 */
const describeError = (cause: unknown): string => {
  const error = cause as { code?: string; message?: string };
  const { code, message = '' } = error;

  if (code === 'ENOTFOUND') {
    return 'DNS 解析失败：找不到主机';
  }

  if (code === 'ECONNREFUSED') {
    return 'TCP 连接被拒绝（目标端口未监听或防火墙拦截）';
  }

  if (code === 'ECONNRESET') {
    return '连接被服务端重置（ECONNRESET）';
  }

  if (code === 'ETIMEDOUT') {
    return '连接超时（ETIMEDOUT）';
  }

  if (code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
    return 'TLS 证书校验失败：证书与主机名不匹配';
  }

  if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return 'TLS 证书校验失败：无法验证证书链';
  }

  return message ? `请求失败：${message}` : '请求失败，请检查网络或目标地址';
};

/**
 * 用 Node 原生 http/https 发起一次真实 GET 请求，逐阶段实测耗时。
 *
 * 阶段与"浏览器输入 URL 到页面展示"对应：URL 解析 → DNS → TCP →
 * TLS（仅 https）→ 发送请求 → 等待服务端首字节 → 接收响应体。
 * 通过请求选项的 lookup 回调与 socket 的 connect / secureConnect 事件、
 * 请求 finish 事件、响应 headers 与 end 事件分别计时。
 *
 * @param targetUrl 已通过契约校验的目标 URL。
 * @param reached 失败前已完成的阶段收集数组（由调用方维护）。
 * @param onPhase 每个阶段完成时的回调（用于打印日志）。
 */
const runInstrumentedRequest = (
  targetUrl: string,
  reached: ReturnType<typeof LoadPhaseSchema.parse>[],
  onPhase: (entry: ReturnType<typeof LoadPhaseSchema.parse>) => void,
): Promise<LoadOutcome> =>
  new Promise<LoadOutcome>((resolve) => {
    let settled = false;

    const settle = (outcome: LoadOutcome): void => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(outcome);
    };

    let parsed: URL;

    try {
      parsed = new URL(targetUrl);
    } catch {
      settle({ ok: false, error: 'URL 格式无效', reached });

      return;
    }

    const urlStart = performance.now();
    const isHttps = parsed.protocol === 'https:';
    let port = isHttps ? 443 : 80;

    if (parsed.port) {
      port = Number(parsed.port);
    }

    const pathWithSearch = `${parsed.pathname}${parsed.search}`;
    const urlMs = performance.now() - urlStart;
    const urlPhase = phase({
      key: 'url',
      label: 'URL 解析',
      durationMs: urlMs,
      note: '浏览器解析协议、主机、端口、路径与查询串。',
    });
    let collected = reached.concat([urlPhase]);

    onPhase(urlPhase);

    const timings = { dnsMs: 0, tcpMs: 0, tlsMs: 0, requestMs: 0, waitMs: 0, bodyMs: 0 };
    let tcpStart = 0;
    let socketReadyAt = 0;
    let requestSentAt = 0;
    const t0 = performance.now();

    /*
     * agent: false 强制每次新建连接，保证 lookup / connect / secureConnect 事件
     * 必然触发，避免复用 keep-alive 连接导致测不到 TCP/TLS 阶段。
     */
    const options: RequestOptions = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port,
      path: pathWithSearch,
      method: 'GET',
      agent: false,
      lookup: (hostname, opts, callback) => {
        const lookupStart = performance.now();

        dnsLookup(hostname, opts, (error, address, family) => {
          timings.dnsMs = performance.now() - lookupStart;

          const dnsPhase = phase({
            key: 'dns',
            label: 'DNS 解析',
            durationMs: timings.dnsMs,
            note: '把主机名解析成 IP：依次查缓存，未命中再走 DNS 服务器。',
          });

          collected = collected.concat([dnsPhase]);
          onPhase(dnsPhase);
          // TCP 计时从 DNS 返回后开始，与 DNS 阶段区分开。
          tcpStart = performance.now();
          callback(error, address, family);
        });
      },
    };

    const requester = isHttps ? httpsRequest : httpRequest;
    const clientReq = requester(options, (incoming) => {
      const headersAt = performance.now();

      timings.waitMs = headersAt - requestSentAt;

      const waitPhase = phase({
        key: 'wait',
        label: '服务端处理',
        durationMs: timings.waitMs,
        note: '等待响应首字节：包含请求上行 + 服务端处理 + 响应下行。',
      });

      collected = collected.concat([waitPhase]);
      onPhase(waitPhase);

      const status = incoming.statusCode ?? 0;
      const contentType = incoming.headers['content-type'] ?? '—';
      const contentLengthRaw = incoming.headers['content-length'];
      let bodyPreview = '';
      let bodyBytes = 0;

      incoming.on('data', (chunk: Buffer) => {
        bodyBytes += chunk.length;

        if (bodyPreview.length < BODY_PREVIEW_LIMIT) {
          bodyPreview += chunk
            .toString('utf8')
            .slice(0, BODY_PREVIEW_LIMIT - bodyPreview.length);
        }
      });

      incoming.on('end', () => {
        timings.bodyMs = performance.now() - headersAt;

        const bodyPhase = phase({
          key: 'body',
          label: '接收响应体',
          durationMs: timings.bodyMs,
          note: '接收服务端返回的响应体；随后浏览器开始解析渲染。',
        });

        collected = collected.concat([bodyPhase]);
        onPhase(bodyPhase);

        const totalMs = performance.now() - t0;

        settle({
          ok: true,
          data: LoadResponseSchema.parse({
            url: targetUrl,
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port,
            totalMs,
            phases: collected,
            result: {
              status,
              statusText: STATUS_CODES[status] ?? '',
              contentType,
              contentLength: contentLengthRaw ? Number(contentLengthRaw) : null,
              bodyLength: bodyBytes,
              redirected: status >= 300 && status < 400,
              bodyPreview: bodyPreview.slice(0, BODY_PREVIEW_LIMIT),
            },
          }),
        });
      });

      incoming.on('error', (cause) => {
        settle({
          ok: false,
          error: `接收响应体失败：${describeError(cause)}`,
          reached: collected,
        });
      });
    });

    clientReq.on('socket', (socket) => {
      socket.on('connect', () => {
        timings.tcpMs = performance.now() - tcpStart;

        const tcpPhase = phase({
          key: 'tcp',
          label: 'TCP 连接',
          durationMs: timings.tcpMs,
          note: '与服务器建立 TCP 连接（SYN → SYN+ACK → ACK 三次握手）。',
        });

        collected = collected.concat([tcpPhase]);
        onPhase(tcpPhase);
        socketReadyAt = performance.now();

        // http 请求无 TLS 阶段，补一个 0ms 的"跳过"条目，保证阶段齐全。
        if (!isHttps) {
          const tlsSkipped = phase({
            key: 'tls',
            label: 'TLS 握手',
            durationMs: 0,
            note: 'http 请求无 TLS 握手，直接明文传输。',
          });

          collected = collected.concat([tlsSkipped]);
          onPhase(tlsSkipped);
        }
      });

      socket.on('secureConnect', () => {
        timings.tlsMs = performance.now() - socketReadyAt;

        const tlsPhase = phase({
          key: 'tls',
          label: 'TLS 握手',
          durationMs: timings.tlsMs,
          note: 'https 下的 TLS 握手：协商加密套件、校验证书、交换密钥。',
        });

        collected = collected.concat([tlsPhase]);
        onPhase(tlsPhase);
        socketReadyAt = performance.now();
      });
    });

    clientReq.on('finish', () => {
      requestSentAt = performance.now();
      timings.requestMs = requestSentAt - socketReadyAt;

      const requestPhase = phase({
        key: 'request',
        label: '发送 HTTP 请求',
        durationMs: timings.requestMs,
        note: '向服务器发送请求行（方法、路径、版本）与请求头。',
      });

      collected = collected.concat([requestPhase]);
      onPhase(requestPhase);
    });

    clientReq.on('error', (cause) => {
      settle({ ok: false, error: describeError(cause), reached: collected });
    });

    clientReq.setTimeout(REQUEST_TIMEOUT_MS, () => {
      clientReq.destroy(new Error('请求超时'));
    });

    clientReq.end();
  });

/**
 * 创建"从 URL 到页面"链路演示路由：用真实请求实测各网络阶段耗时。
 */
export const createUrlToPageRouter = (): ExpressRouter => {
  const router: ExpressRouter = Router();

  const step = (req: Request, name: string, fields: object, message: string) => {
    loggerFor(req).info(
      { demo: 'url-to-page', ...fields },
      `[url-to-page] ${name}: ${message}`,
    );
  };

  router.post('/load', async (req, res) => {
    const input = LoadRequestSchema.safeParse(req.body);

    if (!input.success) {
      res.status(400).json(
        LoadErrorSchema.parse({
          error: 'URL 无效或仅支持 http/https',
          reached: [],
        }),
      );
      return;
    }

    const targetUrl = input.data.url;
    const reached: ReturnType<typeof LoadPhaseSchema.parse>[] = [];

    step(req, 'load', { url: targetUrl }, '开始加载目标 URL');

    const outcome = await runInstrumentedRequest(targetUrl, reached, (entry) => {
      step(
        req,
        'phase',
        { url: targetUrl, key: entry.key, durationMs: entry.durationMs },
        `${entry.label} ${entry.durationMs.toFixed(2)}ms`,
      );
    });

    if (!outcome.ok) {
      step(
        req,
        'load-failed',
        { url: targetUrl, reached: outcome.reached.map((entry) => entry.key) },
        outcome.error,
      );
      res.status(502).json(
        LoadErrorSchema.parse({
          error: outcome.error,
          reached: outcome.reached,
        }),
      );
      return;
    }

    const data = outcome.data as ReturnType<typeof LoadResponseSchema.parse>;

    step(
      req,
      'load-ok',
      { url: targetUrl, status: data.result.status, totalMs: data.totalMs },
      `完成，状态 ${data.result.status}，共 ${data.totalMs.toFixed(2)}ms`,
    );
    res.json(data);
  });

  return router;
};
