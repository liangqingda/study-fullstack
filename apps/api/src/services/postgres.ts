import { Pool } from 'pg';

export const createPostgresPool = (connectionString: string): Pool => {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
  });

  pool.on('error', (error) => {
    const code = (error as NodeJS.ErrnoException).code ?? 'unknown';

    console.error(`[postgres] idle connection error (${code})`);
  });

  return pool;
};
