import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { generateRoutes } from './gen-routes.mjs';
import { routesPlugin } from './routes-plugin.mjs';

const fixture = async (t, files) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'study-routes-'));

  t.after(() => rm(root, { recursive: true, force: true }));
  for (const file of files) {
    const target = path.join(root, 'src/pages', file);

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, 'export default function Page() { return null; }');
  }

  return root;
};

test('generates aliases and nested menus while excluding helpers and error pages', async (t) => {
  const root = await fixture(t, [
    'Express/index.tsx', 'Express/ResponseMethods/index.tsx', 'Express/ResponseMethods/Details.tsx',
    'Express/ResponseMethods/hooks/useRequest.ts', 'Express/utils/helper.ts', 'Errors/NotFound.tsx',
    'Express/types.d.ts', '.hidden/index.tsx',
  ]);
  const { output, count } = await generateRoutes(root);

  assert.equal(count, 3);
  assert.match(output, /from "@\/pages\/Express\/ResponseMethods\/index"/);
  assert.match(output, /path: "\/express\/response-methods\/details"/);
  assert.match(output, /"children":/);
  assert.doesNotMatch(output, /useRequest|helper|NotFound|types\.d|hidden/);
});

test('rejects normalized route collisions without replacing the previous output', async (t) => {
  const root = await fixture(t, ['Demo/FooBar.tsx']);

  await generateRoutes(root);
  const file = path.join(root, 'src/generated/routes.tsx');
  const previous = await readFile(file, 'utf8');

  await writeFile(path.join(root, 'src/pages/Demo/foo-bar.tsx'), 'export default () => null');
  await assert.rejects(generateRoutes(root), /Duplicate route "\/demo\/foo-bar"/);
  assert.equal(await readFile(file, 'utf8'), previous);
});

test('updates deleted routes and leaves unchanged output untouched', async (t) => {
  const root = await fixture(t, ['Demo/index.tsx']);

  await generateRoutes(root);
  const file = path.join(root, 'src/generated/routes.tsx');
  const before = await stat(file);

  assert.equal((await generateRoutes(root)).changed, false);
  assert.equal((await stat(file)).mtimeMs, before.mtimeMs);
  await unlink(path.join(root, 'src/pages/Demo/index.tsx'));
  const { output, count, changed } = await generateRoutes(root);

  assert.equal(count, 0);
  assert.equal(changed, true);
  assert.match(output, /defaultRoutePath = ""/);
  assert.match(output, /demoRoutes: DemoRoute\[\] = \[\]/);
});

test('development watcher updates additions/removals and detaches when the server closes', async (t) => {
  const root = await fixture(t, ['Demo/index.tsx']);
  const watcher = new EventEmitter();
  const httpServer = new EventEmitter();
  const plugin = routesPlugin(root);

  await plugin.buildStart();
  plugin.configureServer({ watcher, httpServer, config: { logger: { error: assert.fail } }, ws: { send: assert.fail } });
  const update = watcher.listeners('add')[0];
  const added = path.join(root, 'src/pages/Demo/NewPage.tsx');

  await writeFile(added, 'export default () => null');
  await update(added);
  const outputFile = path.join(root, 'src/generated/routes.tsx');

  assert.match(await readFile(outputFile, 'utf8'), /\/demo\/new-page/);
  await unlink(added);
  await watcher.listeners('unlink')[0](added);
  assert.doesNotMatch(await readFile(outputFile, 'utf8'), /\/demo\/new-page/);
  httpServer.emit('close');
  assert.equal(watcher.listenerCount('add'), 0);
  assert.equal(watcher.listenerCount('unlink'), 0);
});
