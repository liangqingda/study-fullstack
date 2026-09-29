import { describe, expect, it } from 'vitest';

import { readConfig } from '../src/consts/config';

describe('configuration', () => {
  it('requires explicit production CORS origins', () => {
    expect(() => readConfig({ NODE_ENV: 'production' })).toThrow('CORS_ORIGINS');
    expect(() => readConfig({ NODE_ENV: 'production', CORS_ORIGINS: '*' })).toThrow(
      'explicit HTTP origins',
    );
    expect(
      readConfig({ NODE_ENV: 'production', CORS_ORIGINS: 'https://example.com' }).corsOrigins,
    ).toEqual(['https://example.com']);
  });

  it('rejects invalid ports', () => {
    expect(() => readConfig({ HTTP_PORT: '65536' })).toThrow('HTTP_PORT');
  });

  it('allows the existing React demo origin in development only', () => {
    expect(readConfig({ NODE_ENV: 'development' }).corsOrigins).toEqual(['http://localhost:5173']);
    expect(readConfig({ NODE_ENV: 'test' }).corsOrigins).toEqual([]);
  });

  it('enables PostgreSQL only with a nonempty connection string', () => {
    expect(readConfig({ NODE_ENV: 'test' }).databaseUrl).toBeUndefined();
    expect(() => readConfig({ DATABASE_URL: '' })).toThrow('DATABASE_URL');
    expect(readConfig({ DATABASE_URL: 'postgresql://example.invalid/db' }).databaseUrl).toBe(
      'postgresql://example.invalid/db',
    );
  });
});
