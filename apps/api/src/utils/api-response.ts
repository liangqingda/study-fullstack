import type { Response } from 'express';

/**
 * 统一的 API 响应信封。
 *
 * 提供 `success` / `error` / `paginated` 三个静态方法，构造并发送标准化的
 * JSON 响应体，避免各路由手写不一致的返回形状。新业务路由统一从本工具
 * 出口发送响应；现有的教学 demo 路由刻意保持 Express 原生裸响应，不强制迁移。
 */
export const ApiResponse = {
  /**
   * 发送成功响应。
   *
   * 响应体形状：`{ status: 'success', message?, data }`。
   *
   * @param res 要写入的 Express 响应对象。
   * @param data 载荷数据，置于 `data` 字段。
   * @param message 可选的成功提示语。
   * @param statusCode HTTP 状态码，默认 200。
   * @returns 传入的响应对象，便于链式调用。
   */
  success<T>(res: Response, data: T, message?: string, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      ...(message && { message }),
      data,
    });
  },

  /**
   * 发送错误响应。
   *
   * 响应体形状：`{ status: 'error', message, errors? }`。
   *
   * @param res 要写入的 Express 响应对象。
   * @param message 面向调用方的错误说明。
   * @param statusCode HTTP 状态码，默认 500。
   * @param errors 可选的字段级错误明细，如校验失败时的错误数组。
   * @returns 传入的响应对象，便于链式调用。
   */
  error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: unknown,
  ) {
    return res.status(statusCode).json({
      status: 'error',
      message,
      ...(errors !== undefined && { errors }),
    });
  },

  /**
   * 发送分页列表响应。
   *
   * 响应体形状：`{ status: 'success', data, pagination: { page, limit, total, pages } }`。
   *
   * @param res 要写入的 Express 响应对象。
   * @param items 当前页的数据数组，置于 `data` 字段。
   * @param page 当前页码，从 1 开始。
   * @param limit 每页条数。
   * @param total 符合条件的总条数，用于计算总页数。
   * @returns 传入的响应对象，便于链式调用。
   */
  paginated<T>(
    res: Response,
    items: T[],
    page: number,
    limit: number,
    total: number,
  ) {
    return res.json({
      status: 'success',
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  },
};
