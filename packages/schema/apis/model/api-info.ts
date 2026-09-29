import type { z } from 'zod';

export enum HttpMethodEnum {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete',
}

export interface ApiInfo {
  method: HttpMethodEnum;
  path: string;
  summary: string;
  tags?: string[];
  query?: z.ZodObject;
  params?: z.ZodObject;
  body?: z.ZodType;
  bodyRequired?: boolean;
  response: z.ZodType;
  responseStatus?: number;
  errorResponses?: Record<number, z.ZodType>;
  retry?: boolean;
  requiresAuth?: boolean;
}

export const defineApiInfo = (info: ApiInfo): ApiInfo => ({
  ...info,
  retry: info.retry ?? false,
  requiresAuth: info.requiresAuth ?? false,
});
