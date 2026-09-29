import { z } from 'zod';

const ENVIRONMENT = z.object({
  HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().trim().min(1).optional(),
});

export type AppConfig = {
  httpPort: number;
  nodeEnv: 'development' | 'test' | 'production';
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  corsOrigins: string[];
  databaseUrl?: string;
};

export const readConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const RESULT = ENVIRONMENT.safeParse(env);

  if (!RESULT.success) {
    throw new Error(
      `Invalid environment configuration: ${RESULT.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }

  const CORS_ORIGINS =
    RESULT.data.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? (RESULT.data.NODE_ENV === 'development' ? ['http://localhost:5173'] : []);

  if (RESULT.data.NODE_ENV === 'production' && CORS_ORIGINS.length === 0) {
    throw new Error('CORS_ORIGINS is required in production');
  }

  if (CORS_ORIGINS.some((origin) => origin === '*' || !/^https?:\/\/[^/]+$/.test(origin))) {
    throw new Error('CORS_ORIGINS must contain explicit HTTP origins');
  }

  return {
    httpPort: RESULT.data.HTTP_PORT,
    nodeEnv: RESULT.data.NODE_ENV,
    logLevel: RESULT.data.LOG_LEVEL,
    corsOrigins: CORS_ORIGINS,
    databaseUrl: RESULT.data.DATABASE_URL,
  };
};
