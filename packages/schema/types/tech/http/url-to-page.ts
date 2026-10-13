// start of generated types
/**
 * 发起一次"从 URL 到页面"加载的请求体，携带目标 URL
 */
export type UrlToPageLoadRequest = {
  /** 要加载的目标 URL，仅支持 http/https */
  url: string;
};

/**
 * 网络链路中一个阶段的实测结果
 */
export type UrlToPageLoadPhase = {
  /** 阶段标识 */
  key: 'url' | 'dns' | 'tcp' | 'tls' | 'request' | 'wait' | 'body';
  /** 阶段的中文名称 */
  label: string;
  /** 该阶段实测耗时，单位毫秒 */
  durationMs: number;
  /** 该阶段的机制说明 */
  note: string;
};

/**
 * 加载成功的响应：链路阶段实测耗时与服务端返回摘要
 */
export type UrlToPageLoadResponse = {
  /** 请求的目标 URL */
  url: string;
  /** URL 解析出的协议 */
  protocol: string;
  /** URL 解析出的主机名 */
  hostname: string;
  /** 使用的端口；未显式指定时为协议默认端口 */
  port: number;
  /** 本次链路总耗时，单位毫秒 */
  totalMs: number;
  /** 网络链路各阶段的实测结果 */
  phases: UrlToPageLoadPhase[];
  /** 服务端返回摘要 */
  result: {
    /** HTTP 状态码 */
    status: number;
    /** 状态码对应的文字 */
    statusText: string;
    /** Content-Type 响应头 */
    contentType: string;
    /** Content-Length 响应头（若存在） */
    contentLength: number | null;
    /** 实际读取到的响应体长度 */
    bodyLength: number;
    /** 是否发生了重定向（本次不跟随） */
    redirected: boolean;
    /** 响应体片段（截断到 2KB，便于观察） */
    bodyPreview: string;
  };
};

/**
 * 加载失败的响应，含失败前已完成的链路阶段
 */
export type UrlToPageLoadError = {
  /** 错误信息 */
  error: string;
  /** 失败前已完成的链路阶段 */
  reached: UrlToPageLoadPhase[];
};
