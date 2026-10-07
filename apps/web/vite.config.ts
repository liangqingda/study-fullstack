import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

import { routesPlugin } from './scripts/routes-plugin.mjs';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const srcDir = normalizePath(path.resolve(rootDir, 'src'));
const scssExtension = '.scss';
const scssModuleExtension = '.module.scss';
const scssModuleQuery = 'implicit-scss-module';
const scssModuleIdSuffix = `${scssModuleExtension}?${scssModuleQuery}`;
const backendRoot = path.resolve(rootDir, '../api');
const schemaRoot = path.resolve(rootDir, '../../packages/schema');
const previewFiles = new Set([
  'src/services/app.ts',
  'src/middlewares/error-handler.ts',
  'src/express/middleware/index.ts',
  'src/express/error-handling/index.ts',
  'src/express/response-methods/index.ts',
  'src/express/response-methods/assets/response-demo.txt',
  'src/express/response-methods/views/response-demo.ejs',
  'src/express/sms-login/index.ts',
  'src/services/redis.ts',
  'src/express/transactions/index.ts',
  'src/express/transactions/run.ts',
]);
const schemaPreviewFiles = new Set(['apis/sms-login/index.ts', 'apis/transactions/index.ts', 'apis/model/api-info.ts']);

const backendSourcePreview = (): Plugin => ({
  name: 'backend-source-preview',
  configureServer(server) {
    const preview = (root: string, allowed: Set<string>) => async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
      if (req.method !== 'GET') {
        res.writeHead(405).end();
        return;
      }

      const sourcePath = decodeURIComponent(new URL(req.url ?? '', 'http://localhost').pathname).replace(/^\//, '');

      if (!allowed.has(sourcePath)) {
        res.writeHead(404).end();
        return;
      }

      try {
        const code = await readFile(path.resolve(root, sourcePath), 'utf-8');

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(code);
      } catch (error) {
        next(error);
      }
    };

    server.middlewares.use('/__demo_source/', preview(backendRoot, previewFiles));
    server.middlewares.use('/__demo_schema/', preview(schemaRoot, schemaPreviewFiles));
  },
});

const toScssModuleId = (filePath: string) => {
  const normalizedPath = normalizePath(filePath);

  return `${normalizedPath.slice(0, -scssExtension.length)}${scssModuleIdSuffix}`;
};

const toScssSourceFile = (id: string) => {
  const normalizedId = normalizePath(id);

  if (!normalizedId.endsWith(scssModuleIdSuffix)) {
    return null;
  }

  return `${normalizedId.slice(0, -scssModuleIdSuffix.length)}${scssExtension}`;
};

const shouldUseScssModule = (filePath: string) => {
  const normalizedPath = normalizePath(filePath);

  return (
    normalizedPath.startsWith(`${srcDir}/`) &&
    normalizedPath.endsWith(scssExtension) &&
    !normalizedPath.endsWith(scssModuleExtension) &&
    !normalizedPath.endsWith('/global.scss')
  );
};

const implicitScssModules = (): Plugin => ({
  name: 'implicit-scss-modules',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (
      !importer ||
      !source.endsWith(scssExtension) ||
      source.endsWith(scssModuleExtension)
    ) {
      return null;
    }

    const resolved = await this.resolve(source, importer, {
      ...options,
      skipSelf: true,
    });

    if (!resolved || !shouldUseScssModule(resolved.id)) {
      return null;
    }

    return toScssModuleId(resolved.id);
  },
  async load(id) {
    const sourceFile = toScssSourceFile(id);

    if (!sourceFile) {
      return null;
    }

    this.addWatchFile(sourceFile);

    return readFile(sourceFile, 'utf-8');
  },
  handleHotUpdate(context) {
    if (!shouldUseScssModule(context.file)) {
      return;
    }

    const module = context.server.moduleGraph.getModuleById(
      toScssModuleId(context.file),
    );

    if (!module) {
      return;
    }

    return [module];
  },
});

// https://vite.dev/config/
export default defineConfig({
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  plugins: [routesPlugin(rootDir), implicitScssModules(), backendSourcePreview(), react()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_TARGET ?? 'http://localhost:3000',
    },
  },
});
