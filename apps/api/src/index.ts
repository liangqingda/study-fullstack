import 'dotenv/config';

import { readConfig } from './consts/config';
import { createApp } from './services/app';
import { createPostgresPool } from './services/postgres';

const config = readConfig();
const postgres = config.databaseUrl ? createPostgresPool(config.databaseUrl) : undefined;
const server = createApp(config, postgres).listen(config.httpPort, () => {
  console.info(`Server running at http://localhost:${config.httpPort}`);
});

let shuttingDown = false;

const shutdown = async () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  } catch (error) {
    console.error('[server] shutdown failed', error);
    process.exitCode = 1;
  } finally {
    try {
      await postgres?.end();
    } catch (error) {
      console.error('[postgres] pool shutdown failed', error);
      process.exitCode = 1;
    }
  }
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
