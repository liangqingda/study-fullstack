#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import openapiTS, { astToString } from 'openapi-typescript';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaRoot = path.resolve(root, '../../packages/schema');
const outputDir = path.resolve(root, 'src/apis');
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

const toIdentifier = (method, route) => {
  const words = [method, ...route.split('/').filter(Boolean).map((part) => part.replace(/[{}]/g, ''))];
  const [first, ...rest] = words.map((part) => part.replace(/[^a-zA-Z0-9]+/g, ' ').trim());
  const name = [first?.toLowerCase(), ...rest.map((part) => part.split(' ').map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`).join(''))].join('');

  return /^[a-zA-Z_$][\w$]*$/.test(name) ? name : `api${name[0]?.toUpperCase() ?? ''}${name.slice(1)}`;
};

/**
 * 把任意标识串规范化为 kebab-case（用于 demo 文件名）。
 */
const toKebabCase = (value) =>
  value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

/**
 * 从一条路由及其首个操作推导 demo 分组键：
 * 优先取 OpenAPI 操作的 tags（与 demo 名对应），回退到 `/api/` 后的第一个路径段。
 */
const demoKeyFor = (route, pathItem) => {
  const tags = Object.values(pathItem ?? {})
    .filter((operation) => operation && typeof operation === 'object' && !('$ref' in operation))
    .flatMap((operation) => operation.tags ?? [])
    .map(toKebabCase)
    .filter(Boolean);

  if (tags.length) {
    return tags[0];
  }

  const firstSegment = route.replace(/^\/api\/?/, '').split('/')[0];

  return firstSegment ? toKebabCase(firstSegment) : 'api';
};

const responseType = async (operation, opType, schemaType) => {
  const responses = operation.responses ?? {};
  const success = Object.keys(responses).filter((status) => /^2\d\d$/.test(status)).sort();

  if (!success.length) {
    throw new Error(`${opType} has no 2xx response`);
  }

  const branches = await Promise.all(success.map(async (status) => {
    const response = responses[status];
    const content = response?.content ?? {};

    if ('application/json' in content) {
      return schemaType(content['application/json'].schema);
    }

    if (Object.keys(content).length) {
      throw new Error(`${opType} has an unsupported non-JSON 2xx response (${status})`);
    }

    return 'void';
  }));

  return [...new Set(branches)].join(' | ');
};

export const generateApiClient = async (document) => {
  if (!document || typeof document !== 'object' || !String(document.openapi ?? '').startsWith('3.')) {
    throw new Error('Expected an OpenAPI 3 document');
  }

  // schemaType 在分组循环外定义，通过 activeImportedTypes 指向当前 demo 分组，收集该文件要导入的 schema 类型。
  let activeImportedTypes = new Set();
  const schemaType = async (schema) => {
    const nodes = await openapiTS({
      openapi: '3.1.0',
      info: { title: 'Input', version: '1' },
      paths: {},
      components: { schemas: { ...document.components?.schemas, GeneratedInput: schema ?? {} } },
    });
    const components = nodes.find((node) => ts.isInterfaceDeclaration(node) && node.name.text === 'components');
    const schemas = components.members.find((member) => member.name?.text === 'schemas');
    const input = schemas.type.members.find((member) => member.name?.text === 'GeneratedInput');
    // Keep OpenAPI's inline types, but resolve named references through the shared package.
    const transformed = ts.transform(input.type, [(context) => {
      const visit = (node) => {
        if (ts.isIndexedAccessTypeNode(node) && ts.isIndexedAccessTypeNode(node.objectType)
          && ts.isTypeReferenceNode(node.objectType.objectType) && ts.isIdentifier(node.objectType.objectType.typeName)
          && node.objectType.objectType.typeName.text === 'components') {
          const name = node.indexType.literal.text;

          if (!/^[a-zA-Z_$][\w$]*$/.test(name) || !Object.hasOwn(document.components?.schemas ?? {}, name)) {
            throw new Error(`Unsupported schema reference: ${name}`);
          }

          activeImportedTypes.add(name);
          return ts.factory.createTypeReferenceNode(name);
        }

        return ts.visitEachChild(node, visit, context);
      };

      return (node) => ts.visitNode(node, visit);
    }]);

    try {
      return astToString(transformed.transformed).trim();
    } finally {
      transformed.dispose();
    }
  };
  const parameterType = (parameters) => schemaType({
    type: 'object',
    properties: Object.fromEntries(parameters.map((parameter) => [parameter.name, parameter.schema])),
    required: parameters.filter((parameter) => parameter.required).map((parameter) => parameter.name),
  });
  const usedNames = new Set();
  // demoKey -> { entries, importedTypes, httpImports }
  const demoGroups = new Map();

  for (const [route, pathItem] of Object.entries(document.paths ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const demoKey = demoKeyFor(route, pathItem);

    if (!demoGroups.has(demoKey)) {
      demoGroups.set(demoKey, {
        entries: [],
        importedTypes: new Set(),
        httpImports: new Set(),
      });
    }

    const group = demoGroups.get(demoKey);

    activeImportedTypes = group.importedTypes;

    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!methods.has(method)) {
        continue;
      }

      if (!operation || typeof operation !== 'object' || '$ref' in operation) {
        throw new Error(`Unsupported operation: ${method.toUpperCase()} ${route}`);
      }

      const name = toIdentifier(method, route);

      if (usedNames.has(name)) {
        throw new Error(`Duplicate generated function name: ${name}`);
      }

      usedNames.add(name);
      const opType = `paths[${JSON.stringify(route)}][${JSON.stringify(method)}]`;
      const allParams = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])];
      const hasPath = allParams.some((parameter) => parameter.in === 'path');
      const hasQuery = allParams.some((parameter) => parameter.in === 'query');
      const requiredQuery = allParams.some((parameter) => parameter.in === 'query' && parameter.required);
      const hasBody = Boolean(operation.requestBody);
      const requiredBody = Boolean(operation.requestBody?.required);
      const hasAuth = Boolean(operation.security?.length || document.security?.length);

      if ((route.includes('{') && !hasPath) || (hasBody && !operation.requestBody.content?.['application/json'])) {
        throw new Error(`Unsupported path parameters or request body: ${method.toUpperCase()} ${route}`);
      }
      const fields = [
        ...(hasPath ? [`path: ${await parameterType(allParams.filter((parameter) => parameter.in === 'path'))}`] : []),
        ...(hasQuery ? [`query${requiredQuery ? '' : '?'}: ${await parameterType(allParams.filter((parameter) => parameter.in === 'query'))}`] : []),
        ...(hasBody ? [`body${requiredBody ? '' : '?'}: ${await schemaType(operation.requestBody.content['application/json'].schema)}`] : []),
        ...(hasAuth ? ['headers?: { authorization?: string }'] : []),
        'signal?: AbortSignal',
      ];
      const required = hasPath || requiredQuery || requiredBody;
      const result = await responseType(operation, opType, schemaType);
      const url = hasPath ? `buildPath(${JSON.stringify(route)}, input.path)` : JSON.stringify(route);
      const configs = [
        `method: ${JSON.stringify(method.toUpperCase())}`,
        `url: ${url}`,
        ...(hasQuery ? ['params: input.query'] : []),
        ...(hasBody ? ['data: input.body'] : []),
        ...(hasAuth ? ['headers: input.headers'] : []),
        'signal: input.signal',
      ];
      // get/post/put/patch 复用 http 便捷方法；delete 用 del（delete 为保留字）。
      // head/options 没有便捷方法，回退到通用的 request。
      const methodFns = { get: 'get', post: 'post', put: 'put', patch: 'patch', delete: 'del' };
      const fnName = methodFns[method] ?? null;
      const fnConfigs = [
        ...(hasQuery ? ['params: input.query'] : []),
        ...(hasAuth ? ['headers: input.headers'] : []),
        'signal: input.signal',
      ];

      let call;

      if (fnName) {
        group.httpImports.add(fnName);
        call = hasBody
          ? `\n  ${fnName}<${result}>(${url}, input.body, { ${fnConfigs.join(', ')} });`
          : `\n  ${fnName}<${result}>(${url}, { ${fnConfigs.join(', ')} });`;
      } else {
        group.httpImports.add('request');
        call = `\n  request<${result}>({ ${configs.join(', ')} });`;
      }

      group.entries.push(`export const ${name} = (input: { ${fields.join('; ')} }${required ? '' : ' = {}'}) =>${call}`);
    }
  }

  // 每个 demo 单独成一个文件，index.ts 仅做聚合导出。
  const files = [...demoGroups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([demoKey, group]) => {
      const needsPath = group.entries.some((entry) => entry.includes('buildPath('));

      if (needsPath) {
        group.httpImports.add('buildPath');
      }

      const schemaImport = group.importedTypes.size
        ? `import type { ${[...group.importedTypes].sort().join(', ')} } from '@liangqingda/study-nodejs-schema';\n`
        : '';
      // 生成的函数省略返回类型标注，由 TypeScript 从便捷方法自动推导，故无需导入 AxiosResponse。
      const imports = group.entries.length
        ? `${schemaImport}import { ${[...group.httpImports].sort().join(', ')} } from '@/utils/http';\n\n`
        : '';
      const content = `/* eslint-disable */\n// Generated from study-nodejs-schema. Do not edit.\n${imports}${group.entries.join('\n\n')}${group.entries.length ? '\n' : ''}`;

      return { name: `${demoKey}.ts`, content };
    });
  const index = `/* eslint-disable */\n// Generated from study-nodejs-schema. Do not edit.\n${files.map((file) => `export * from './${file.name.replace(/\.ts$/, '')}';`).join('\n')}\n`;

  return { files, index };
};

const main = async () => {
  execFileSync('pnpm', ['generate:openapi'], { cwd: schemaRoot, stdio: 'inherit' });
  const document = JSON.parse(await readFile(path.join(schemaRoot, 'openApiJsonFile.json'), 'utf8'));
  const { files, index } = await generateApiClient(document);

  await mkdir(outputDir, { recursive: true });

  for (const file of files) {
    await writeFile(path.join(outputDir, file.name), file.content);
  }

  await writeFile(path.join(outputDir, 'index.ts'), index);
  console.log(`Generated ${files.length} API module(s) + index in src/apis`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
