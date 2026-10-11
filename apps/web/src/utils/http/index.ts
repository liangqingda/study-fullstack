import axios, { isAxiosError } from 'axios';

import type { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * 后端统一错误响应体：各 demo 接口约定以 `{ error: string }` 返回错误信息。
 */
export type ApiErrorData = {
  /** 后端返回的错误信息。 */
  error?: string;
  /** 限频场景下建议的重试等待秒数（SmsLogin 发码接口使用）。 */
  retryAfterSeconds?: number;
};

/**
 * 经 response 拦截器归一化后的统一错误对象。
 * 页面只需用 `isApiError` 收窄类型并读取 `message`，无需再逐处拆解 AxiosError。
 */
export type ApiError = {
  /** 判别字段，供 `isApiError` 类型收窄。 */
  isApiError: true;
  /** HTTP 状态码；网络异常/未收到响应时为 undefined。 */
  status?: number;
  /** 可直接展示给用户的错误信息。 */
  message: string;
  /** 后端返回的原始响应体（若存在），用于读取 `retryAfterSeconds` 等扩展字段。 */
  data?: ApiErrorData;
};

/**
 * 把任意 catch 到的错误归一化为 ApiError。
 * - axios 错误：优先取后端 `data.error`；未带响应体时按是否拿到响应给兜底文案；
 * - 非 axios 错误（网络层、fetch 等）：统一网络兜底文案。
 */
export const toApiError = (cause: unknown): ApiError => {
  if (isAxiosError<ApiErrorData>(cause)) {
    const data = cause.response?.data;

    return {
      isApiError: true,
      status: cause.response?.status,
      message:
        data?.error ??
        (cause.response
          ? `请求失败（HTTP ${cause.response.status}）`
          : '网络异常或后端未启动，请检查服务是否运行。'),
      data,
    };
  }

  return {
    isApiError: true,
    status: undefined,
    message: '网络异常或后端未启动，请检查服务是否运行。',
  };
};

/**
 * 类型守卫：判断某个 catch 到的值是否为 ApiError。
 */
export const isApiError = (cause: unknown): cause is ApiError =>
  typeof cause === 'object' &&
  cause !== null &&
  (cause as { isApiError?: unknown }).isApiError === true;

/** 单个请求的默认超时（毫秒），可按请求通过 `timeout` 覆盖。 */
const DEFAULT_TIMEOUT_MS = 10_000;

export const http = axios.create({ baseURL: '/', timeout: DEFAULT_TIMEOUT_MS });

/** 响应拦截器：把 AxiosError 统一归一化为 ApiError 后 reject，页面无需再各自拆 isAxiosError + response.data。 */
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

export const request = <T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
  http.request<T>(config);

/**
 * 除 method / url / data 之外可下发给单个请求的选项（如 params、headers、signal、timeout）。
 */
export type HttpOptions = Omit<AxiosRequestConfig, 'method' | 'url' | 'data'>;

/**
 * 便捷方法：基于 `request` 按 HTTP 动词封装，供页面与生成的 API 客户端复用。
 * 返回类型与 `request` 一致（`AxiosResponse<T>`），可透传 signal / params / headers 等选项。
 */
export const get = <T>(url: string, config?: HttpOptions): Promise<AxiosResponse<T>> =>
  request<T>({ ...config, method: 'GET', url });

export const post = <T>(
  url: string,
  data?: unknown,
  config?: HttpOptions,
): Promise<AxiosResponse<T>> => request<T>({ ...config, method: 'POST', url, data });

export const put = <T>(
  url: string,
  data?: unknown,
  config?: HttpOptions,
): Promise<AxiosResponse<T>> => request<T>({ ...config, method: 'PUT', url, data });

export const patch = <T>(
  url: string,
  data?: unknown,
  config?: HttpOptions,
): Promise<AxiosResponse<T>> => request<T>({ ...config, method: 'PATCH', url, data });

/**
 * DELETE 请求。命名用 `del` 而非 `delete`，因为 `delete` 是 JavaScript 保留字。
 */
export const del = <T>(url: string, config?: HttpOptions): Promise<AxiosResponse<T>> =>
  request<T>({ ...config, method: 'DELETE', url });

/**
 * 构造带 Bearer 认证的 headers。
 *
 * 本项目的登录 token 按客户端 label 分开存储、由页面本地管理（SmsLogin 的 A/B
 * 双客户端各自持独立 token），因此不放进全局拦截器集中注入，而是由调用方按需传入；
 * token 为空时返回 undefined，表示不携带认证头。
 */
export const bearerAuth = (
  token: string | null | undefined,
): { authorization?: string } | undefined =>
  token ? { authorization: `Bearer ${token}` } : undefined;

export const buildPath = (
  template: string,
  params: Record<string, string | number | null | undefined>,
): string =>
  template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = params[name];

    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter: ${name}`);
    }

    return encodeURIComponent(String(value));
  });

export { isAxiosError } from 'axios';
