import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const children = new Set();
const stopping = new WeakSet();
let shuttingDown = false;
let api;
let watcher;
let timer;
let syncing = false;
let dirty = false;

const launch = (args) => {
  const child = spawn('pnpm', args, {
    cwd: root, stdio: 'inherit', detached: process.platform !== 'win32',
  });

  children.add(child);
  child.once('exit', () => children.delete(child));
  child.once('error', (error) => {
    children.delete(child);
    console.error('[dev]', error.message);
    void shutdown(1);
  });

  return child;
};

const signal = (child, value) => {
  if (!child.pid) { return; }

  try {
    if (process.platform === 'win32') {
      child.kill(value);
    } else {
      process.kill(-child.pid, value);
    }
  } catch (error) {
    if (error.code !== 'ESRCH') { throw error; }
  }
};

const stop = async (child) => {
  if (!child || child.exitCode !== null || child.signalCode !== null) { return; }

  stopping.add(child);
  await new Promise((resolve) => {
    const deadline = setTimeout(() => signal(child, 'SIGKILL'), 5_000);

    child.once('exit', () => {
      clearTimeout(deadline);
      resolve();
    });
    signal(child, 'SIGTERM');
  });
};

const shutdown = async (code = 0) => {
  if (shuttingDown) { return; }

  shuttingDown = true;
  process.exitCode = code;
  clearTimeout(timer);
  watcher?.close();
  await Promise.all([...children].map(stop));
};

const startService = (args) => {
  const child = launch(args);

  child.once('exit', (code) => {
    if (!shuttingDown && !stopping.has(child)) {
      console.error(`[dev] ${args.join(' ')} stopped (${code ?? 'signal'})`);
      void shutdown(code || 1);
    }
  });

  return child;
};

const sync = () => new Promise((resolve, reject) => {
  const child = launch(['sync']);

  child.once('error', reject);
  child.once('exit', (code) => {
    if (code === 0) { resolve(); } else { reject(new Error(`Workspace sync failed (${code ?? 'signal'})`)); }
  });
});

const refresh = async () => {
  if (syncing || shuttingDown) { return; }

  syncing = true;
  try {
    while (dirty && !shuttingDown) {
      dirty = false;
      console.info('[dev] Schema changed; synchronizing contracts and restarting API…');
      await stop(api);
      await sync();
      if (!shuttingDown && !dirty) {
        api = startService(['--filter', 'study-nodejs', 'start:dev']);
      }
    }
  } catch (error) {
    if (!shuttingDown) {
      console.error(`[dev] ${error.message}; fix the schema and save again to retry.`);
    }
  } finally {
    syncing = false;
    if (dirty && !shuttingDown) { void refresh(); }
  }
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

try {
  // Prepare contracts before either service can import generated package exports.
  await sync();
  if (!shuttingDown) {
    api = startService(['--filter', 'study-nodejs', 'start:dev']);
    startService(['--filter', 'study-react', 'dev']);
    watcher = watch(path.join(root, 'packages/schema'), { recursive: true }, (_event, filename) => {
      const file = filename?.replaceAll(path.sep, '/');

      if (!file || file === 'types/api-types.ts' ||
        !(file === 'index.ts' || file === 'package.json' || /^(apis|common|types|scripts)\/.*\.ts$/.test(file))) {
        return;
      }

      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 250);
    });
    watcher.on('error', (error) => {
      console.error('[dev] Schema watcher failed:', error.message);
      void shutdown(1);
    });
  }
} catch (error) {
  if (!shuttingDown) { console.error('[dev]', error.message); }
  await shutdown(1);
}
