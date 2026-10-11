import { z } from 'zod';

import { defineApiInfo, HttpMethodEnum } from '../../model/api-info';

/**
 * 目标 URL 校验：必须是合法的 http/https 地址。
 * 用 zod 的 .url() 校验整体格式，再用正则限定 scheme 为 http/https（拒绝 ftp、file 等）。
 */
const targetUrl = () =>
  z
    .string()
    .url('URL 格式无效')
    .refine((value) => /^https?:\/\//i.test(value), '仅支持 http/https 协议')
    .describe('要加载的目标 URL，仅支持 http/https');

/**
 * 加载请求的请求体：只需一个目标 URL。
 */
export const LoadRequestSchema = z
  .object({
    /** 要加载的目标 URL。 */
    url: targetUrl(),
  })
  .openapi('UrlToPageLoadRequest')
  .describe('发起一次"从 URL 到页面"加载的请求体，携带目标 URL');

/**
 * 网络链路的单个阶段。
 *
 * key 与 label 一一对应，覆盖：URL 解析、DNS、TCP、TLS、发送请求、
 * 等待服务端（首字节）、接收响应体。durationMs 为实测耗时（毫秒）。
 */
export const LoadPhaseSchema = z
  .object({
    /** 阶段标识。 */
    key: z
      .enum(['url', 'dns', 'tcp', 'tls', 'request', 'wait', 'body'])
      .describe('阶段标识'),
    /** 阶段的中文名称。 */
    label: z.string().describe('阶段的中文名称'),
    /** 该阶段实测耗时，单位毫秒。 */
    durationMs: z.number().nonnegative().describe('该阶段实测耗时，单位毫秒'),
    /** 该阶段的机制说明。 */
    note: z.string().describe('该阶段的机制说明'),
  })
  .openapi('UrlToPageLoadPhase')
  .describe('网络链路中一个阶段的实测结果');

/**
 * 加载成功后的整体响应：网络链路的逐阶段耗时 + 服务端返回摘要。
 */
export const LoadResponseSchema = z
  .object({
    /** 请求的目标 URL。 */
    url: z.string().url().describe('请求的目标 URL'),
    /** URL 解析出的协议。 */
    protocol: z.string().describe('URL 解析出的协议'),
    /** URL 解析出的主机名。 */
    hostname: z.string().describe('URL 解析出的主机名'),
    /** 使用的端口；未显式指定时为协议默认端口。 */
    port: z.number().int().describe('使用的端口；未显式指定时为协议默认端口'),
    /** 本次链路总耗时，单位毫秒。 */
    totalMs: z.number().nonnegative().describe('本次链路总耗时，单位毫秒'),
    /** 网络链路各阶段的实测结果。 */
    phases: z.array(LoadPhaseSchema).describe('网络链路各阶段的实测结果'),
    /** 服务端返回摘要。 */
    result: z
      .object({
        /** HTTP 状态码。 */
        status: z.number().int().describe('HTTP 状态码'),
        /** 状态码对应的文字。 */
        statusText: z.string().describe('状态码对应的文字'),
        /** Content-Type 响应头。 */
        contentType: z.string().describe('Content-Type 响应头'),
        /** Content-Length 响应头（若存在）；缺失时为 null。 */
        contentLength: z.number().int().nullable().describe('Content-Length 响应头（若存在）'),
        /** 实际读取到的响应体长度。 */
        bodyLength: z.number().int().describe('实际读取到的响应体长度'),
        /** 是否发生了重定向（本次不跟随，直接上报重定向状态码）。 */
        redirected: z.boolean().describe('是否发生了重定向（本次不跟随）'),
        /** 响应体片段（截断到 2KB，便于观察）。 */
        bodyPreview: z.string().describe('响应体片段（截断到 2KB，便于观察）'),
      })
      .describe('服务端返回摘要'),
  })
  .openapi('UrlToPageLoadResponse')
  .describe('加载成功的响应：链路阶段实测耗时与服务端返回摘要');

/**
 * 加载失败的响应：网络错误、协议不支持或超时等。
 */
export const LoadErrorSchema = z
  .object({
    /** 错误信息。 */
    error: z.string().describe('错误信息'),
    /** 已观测到的链路阶段（失败前完成的阶段），便于定位卡在哪一步。 */
    reached: z.array(LoadPhaseSchema).describe('失败前已完成的链路阶段'),
  })
  .openapi('UrlToPageLoadError')
  .describe('加载失败的响应，含失败前已完成的链路阶段');

/**
 * 加载链路 API 契约：后端用 Node 原生 http/https 发起真实请求，实测各阶段耗时。
 */
export const loadApi = defineApiInfo({
  method: HttpMethodEnum.POST,
  path: '/api/http/url-to-page/load',
  summary:
    'Load a URL with an instrumented real Node http/https request and report per-phase timings (URL/DNS/TCP/TLS/request/wait/body)',
  tags: ['UrlToPage'],
  body: LoadRequestSchema,
  response: LoadResponseSchema,
  errorResponses: { 400: LoadErrorSchema, 502: LoadErrorSchema },
});
