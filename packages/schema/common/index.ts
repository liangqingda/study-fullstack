import { z } from 'zod';

export const isZodObject = (value: unknown): value is z.ZodObject => value instanceof z.ZodObject;
