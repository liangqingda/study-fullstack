import { describe, expect, it } from 'vitest';

import type { Response } from 'express';

import { ApiResponse } from '../src/utils/api-response';

/** 构造一个只记录状态码与响应体的最小 Express Response stub。 */
const makeRes = (): Response & { statusCode: number; body: unknown } => {
  let statusCode = 200;
  let body: unknown;

  return {
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as unknown as Response & { statusCode: number; body: unknown };
};

describe('ApiResponse', () => {
  it('success 返回 200 与 { status, data }，不携带多余字段', () => {
    const res = makeRes();

    ApiResponse.success(res, { id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'success', data: { id: 1 } });
  });

  it('success 支持 message 与自定义状态码', () => {
    const res = makeRes();

    ApiResponse.success(res, null, '创建成功', 201);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      status: 'success',
      message: '创建成功',
      data: null,
    });
  });

  it('error 默认返回 500 与 { status: "error", message }', () => {
    const res = makeRes();

    ApiResponse.error(res, 'Internal server error');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Internal server error',
    });
  });

  it('error 支持自定义状态码与字段级错误明细', () => {
    const res = makeRes();

    ApiResponse.error(
      res,
      'Validation failed',
      400,
      [{ field: 'email', message: 'invalid' }],
    );
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      status: 'error',
      message: 'Validation failed',
      errors: [{ field: 'email', message: 'invalid' }],
    });
  });

  it('paginated 返回数据数组与分页元信息，pages 向上取整', () => {
    const res = makeRes();

    ApiResponse.paginated(res, [1, 2, 3], 2, 10, 23);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      data: [1, 2, 3],
      pagination: { page: 2, limit: 10, total: 23, pages: 3 },
    });
  });
});
