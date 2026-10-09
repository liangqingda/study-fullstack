import type { z } from 'zod';

/** HTTP 方法枚举。 */
export enum HttpMethodEnum {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete',
}

/**
 * 描述一个 API 端点的元信息，供前后端共享路由生成和文档使用。
 */
export interface ApiInfo {
  /** 请求方法。 */
  method: HttpMethodEnum;
  /** 路由路径，如 `/api/sms-login/send-code`。 */
  path: string;
  /** 接口简短摘要，展示在文档和目录中。 */
  summary: string;
  /** 分组标签，用于在文档中归类。 */
  tags?: string[];
  /** query string 的 Zod schema。 */
  query?: z.ZodObject;
  /** 路径参数的 Zod schema（如 `/users/:id`）。 */
  params?: z.ZodObject;
  /** 请求体的 Zod schema。 */
  body?: z.ZodType;
  /** 请求体是否必填。 */
  bodyRequired?: boolean;
  /** 成功响应的 Zod schema。 */
  response: z.ZodType;
  /** 成功状态码，默认 200。 */
  responseStatus?: number;
  /** 错误响应映射，key 为状态码。 */
  errorResponses?: Record<number, z.ZodType>;
  /** 前端请求失败时是否自动重试。 */
  retry?: boolean;
  /** 是否需要登录 token。 */
  requiresAuth?: boolean;
}

/**
 * 构造 ApiInfo，填充 retry 和 requiresAuth 的默认值。
 */
export const defineApiInfo = (info: ApiInfo): ApiInfo => ({
  ...info,
  retry: info.retry ?? false,
  requiresAuth: info.requiresAuth ?? false,
});
