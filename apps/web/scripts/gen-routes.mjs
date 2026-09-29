#!/usr/bin/env node

import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(rootDir, 'src/pages');
const outputFile = path.join(rootDir, 'src/generated/routes.tsx');
const pageFileExtensionPattern = /\.(tsx|jsx|ts|js)$/;
const ignoredSegmentNames = new Set(['components', 'errors', 'hooks', 'utils']);

const compareByName = (left, right) => left.name.localeCompare(right.name);

const jsString = (value) => JSON.stringify(value);

const pathToRoute = (segments) => `/${segments.join('/')}`;

const toRouteSegment = (value) =>
  value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

const stripPageFileExtension = (fileName) =>
  fileName.replace(pageFileExtensionPattern, '');

const isPageFile = (entry) =>
  entry.isFile() &&
  pageFileExtensionPattern.test(entry.name) &&
  !entry.name.endsWith('.d.ts');

const isIgnoredSegment = (segment) =>
  ignoredSegmentNames.has(segment.toLowerCase());

const toIdentifierPart = (value) =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');

const createIdentifier = (segments, usedIdentifiers) => {
  const baseIdentifier = `${segments.map(toIdentifierPart).join('') || 'Demo'}Page`;
  let identifier = baseIdentifier;
  let suffix = 2;

  while (usedIdentifiers.has(identifier)) {
    identifier = `${baseIdentifier}${suffix}`;
    suffix += 1;
  }

  usedIdentifiers.add(identifier);

  return identifier;
};

const directoryExists = async (directory) => {
  try {
    const entries = await readdir(directory, { withFileTypes: true });

    return entries;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};

const readVisibleEntries = async (directory) => {
  const entries = await directoryExists(directory);

  return entries
    .filter((entry) => !entry.name.startsWith('.'))
    .sort(compareByName);
};

const createSegmentsForFile = (parentSegments, fileName) => {
  const fileSegment = stripPageFileExtension(fileName);

  if (fileSegment === 'index') {
    return parentSegments;
  }

  return [...parentSegments, fileSegment];
};

const collectPageFiles = async (directory, parentSegments = []) => {
  const entries = await readVisibleEntries(directory);
  const pageFiles = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (isPageFile(entry)) {
      const segments = createSegmentsForFile(parentSegments, entry.name);

      if (
        segments.length > 0 &&
        segments.length <= 3 &&
        !segments.some((segment) => isIgnoredSegment(segment))
      ) {
        pageFiles.push({
          filePath: entryPath,
          isIndexFile: stripPageFileExtension(entry.name) === 'index',
          segments,
        });
      }

      continue;
    }

    if (
      entry.isDirectory() &&
      parentSegments.length < 3 &&
      !isIgnoredSegment(entry.name)
    ) {
      pageFiles.push(
        ...(await collectPageFiles(entryPath, [...parentSegments, entry.name])),
      );
    }
  }

  return pageFiles;
};

const createImportPath = (filePath) => {
  const relativePath = path
    .relative(path.join(rootDir, 'src'), filePath)
    .replaceAll(path.sep, '/')
    .replace(/\.(tsx|jsx|ts|js)$/, '');

  return `@/${relativePath}`;
};

const createRouteEntry = ({
  filePath,
  isIndexFile,
  label,
  menuKey,
  segments,
  topLevelKey,
  usedIdentifiers,
}) => ({
  importName: createIdentifier(segments, usedIdentifiers),
  importPath: createImportPath(filePath),
  isIndexFile,
  label,
  menuKey,
  path: pathToRoute(segments.map(toRouteSegment)),
  segments: segments.map(toRouteSegment),
  topLevelKey,
});

const compareSegments = (left, right) => {
  const segmentCount = Math.max(left.segments.length, right.segments.length);

  for (let index = 0; index < segmentCount; index += 1) {
    const leftSegment = left.segments[index];
    const rightSegment = right.segments[index];

    if (leftSegment === undefined) {
      return -1;
    }

    if (rightSegment === undefined) {
      return 1;
    }

    const segmentCompare = leftSegment.localeCompare(rightSegment);

    if (segmentCompare !== 0) {
      return segmentCompare;
    }
  }

  return left.importPath.localeCompare(right.importPath);
};

const groupRoutesByTopLevel = (routes) => {
  const routeGroups = new Map();

  for (const route of routes) {
    const topLevelSegment = route.segments[0];

    if (!routeGroups.has(topLevelSegment)) {
      routeGroups.set(topLevelSegment, []);
    }

    routeGroups.get(topLevelSegment).push(route);
  }

  return [...routeGroups.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
};

const createSidebarMenus = (topLevelRoutes) => {
  const secondLevelRouteGroups = new Map();

  const getRouteGroup = (secondLevelSegment) => {
    if (!secondLevelRouteGroups.has(secondLevelSegment)) {
      secondLevelRouteGroups.set(secondLevelSegment, {
        route: null,
        thirdLevelRoutes: [],
      });
    }

    return secondLevelRouteGroups.get(secondLevelSegment);
  };

  for (const route of topLevelRoutes) {
    const [, secondLevelSegment] = route.segments;

    if (!secondLevelSegment) {
      continue;
    }

    const routeGroup = getRouteGroup(secondLevelSegment);

    if (route.segments.length === 2) {
      routeGroup.route = route;
      continue;
    }

    if (route.segments.length === 3) {
      routeGroup.thirdLevelRoutes.push(route);
    }
  }

  return [...secondLevelRouteGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([secondLevelSegment, routeGroup]) => {
      const { route, thirdLevelRoutes } = routeGroup;

      if (thirdLevelRoutes.length === 0 && route) {
        return {
          key: route.menuKey,
          label: route.label,
          path: route.path,
        };
      }

      return {
        key: `group:${pathToRoute([topLevelRoutes[0].segments[0], secondLevelSegment])}`,
        label: secondLevelSegment,
        children: [
          ...(route
            ? [
                {
                  key: route.menuKey,
                  label: route.isIndexFile ? 'index' : route.label,
                  path: route.path,
                },
              ]
            : []),
          ...thirdLevelRoutes.sort(compareSegments).map((thirdLevelRoute) => ({
            key: thirdLevelRoute.menuKey,
            label: thirdLevelRoute.label,
            path: thirdLevelRoute.path,
          })),
        ],
      };
    });
};

const formatRoutes = (routes) => {
  if (routes.length === 0) {
    return '[]';
  }

  const routeBlocks = routes.map(
    (route) => `  {
    path: ${jsString(route.path)},
    menuKey: ${jsString(route.menuKey)},
    topLevelKey: ${jsString(route.topLevelKey)},
    label: ${jsString(route.label)},
    Component: ${route.importName},
  }`,
  );

  return `[\n${routeBlocks.join(',\n')},\n]`;
};

const formatMenuItems = (menuItems) => JSON.stringify(menuItems, null, 2);

const formatMenuMap = (menuMap) => JSON.stringify(menuMap, null, 2);

const generate = async () => {
  const usedIdentifiers = new Set();
  const usedRoutePaths = new Map();
  const routes = [];
  const headerMenus = [];
  const sidebarMenusByTopLevel = {};

  for (const pageFile of await collectPageFiles(pagesDir)) {
    const routeSegments = pageFile.segments.map(toRouteSegment);
    const topLevelKey = pathToRoute([routeSegments[0]]);
    const routePath = pathToRoute(routeSegments);
    const previousFilePath = usedRoutePaths.get(routePath);

    if (previousFilePath) {
      throw new Error(
        `Duplicate route "${routePath}" generated by ${path.relative(rootDir, previousFilePath)} and ${path.relative(rootDir, pageFile.filePath)}`,
      );
    }

    usedRoutePaths.set(routePath, pageFile.filePath);

    routes.push(
      createRouteEntry({
        filePath: pageFile.filePath,
        isIndexFile: pageFile.isIndexFile,
        label: routeSegments.at(-1),
        menuKey: pageFile.segments.length === 1 ? topLevelKey : routePath,
        segments: pageFile.segments,
        topLevelKey,
        usedIdentifiers,
      }),
    );
  }

  routes.sort(compareSegments);

  for (const [topLevelSegment, topLevelRoutes] of groupRoutesByTopLevel(routes)) {
    topLevelRoutes.sort(compareSegments);

    const topLevelKey = pathToRoute([topLevelSegment]);
    const topLevelRoute = topLevelRoutes.find((route) => route.segments.length === 1);

    headerMenus.push({
      key: topLevelKey,
      label: topLevelSegment,
      path: topLevelRoute?.path ?? topLevelRoutes[0].path,
    });

    sidebarMenusByTopLevel[topLevelKey] = createSidebarMenus(topLevelRoutes);
  }

  const importLines = routes
    .map((route) => `import ${route.importName} from ${jsString(route.importPath)};`)
    .join('\n');
  const defaultRoutePath = routes[0]?.path ?? '';
  const output = `/* eslint-disable */
// This file is auto-generated by \`pnpm gen:routes\`.
import type { ComponentType } from 'react';
${importLines ? `\n${importLines}\n` : ''}
export type DemoRoute = {
  path: string;
  menuKey: string;
  topLevelKey: string;
  label: string;
  Component: ComponentType<any>;
};

export type DemoMenuItem = {
  key: string;
  label: string;
  path?: string;
  children?: DemoMenuItem[];
};

export const defaultRoutePath = ${jsString(defaultRoutePath)};

export const demoRoutes: DemoRoute[] = ${formatRoutes(routes)};

export const headerMenus: DemoMenuItem[] = ${formatMenuItems(headerMenus)};

export const sidebarMenusByTopLevel: Record<string, DemoMenuItem[]> = ${formatMenuMap(
    sidebarMenusByTopLevel,
  )};
`;

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, output);

  console.log(`Generated ${routes.length} route(s) in ${path.relative(rootDir, outputFile)}`);
};

await generate();
