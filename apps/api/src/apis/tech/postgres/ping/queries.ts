import type { Pool } from 'pg';

export type PostgresPing = { database: string; echoed: string };

export type PostgresClient = Pick<Pool, 'query'>;

export const pingPostgres = async (
  client: PostgresClient,
  value: string,
): Promise<PostgresPing> => {
  const result = await client.query<PostgresPing>(
    'SELECT current_database() AS database, $1::text AS echoed',
    [value],
  );
  const [row] = result.rows;

  if (!row) {
    throw new Error('PostgreSQL ping returned no rows');
  }

  return row;
};
