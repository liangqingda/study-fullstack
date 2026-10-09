import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// An empty generated module has no named exports until an API is registered.
export * from './api-types';
