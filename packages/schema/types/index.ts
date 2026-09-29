import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// An empty generated module has no named exports until an API is registered.
// eslint-disable-next-line import/export
export * from './api-types';
