import { z } from 'zod';

/**
 * 类型守卫：判断值是否为 ZodObject。
 */
export const isZodObject = (value: unknown): value is z.ZodObject => value instanceof z.ZodObject;
