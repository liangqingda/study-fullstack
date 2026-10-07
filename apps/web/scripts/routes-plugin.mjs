import path from 'node:path';

import { generateRoutes } from './gen-routes.mjs';

export const routesPlugin = (root) => ({
  name: 'demo-routes',
  async buildStart() {
    await generateRoutes(root);
  },
  configureServer(server) {
    const pages = `${path.resolve(root, 'src/pages').replaceAll(path.sep, '/')}/`;
    let pending = Promise.resolve();
    const update = (file) => {
      if (!file.replaceAll(path.sep, '/').startsWith(pages) || !/\.(tsx|jsx|ts|js)$/.test(file)) {
        return;
      }

      pending = pending.then(() => generateRoutes(root)).catch((error) => {
        server.config.logger.error(`[demo-routes] ${error.message}`);
        server.ws.send({ type: 'error', err: { message: error.message, stack: error.stack } });
      });

      return pending;
    };

    server.watcher.on('add', update).on('unlink', update);
    server.httpServer?.once('close', () => {
      server.watcher.off('add', update).off('unlink', update);
    });
  },
});
