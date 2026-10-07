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

  const importedTypes = new Set();
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

          importedTypes.add(name);
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
  const entries = [];
  const usedNames = new Set();

  for (const [route, pathItem] of Object.entries(document.paths ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
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

      entries.push(`export const ${name} = (input: { ${fields.join('; ')} }${required ? '' : ' = {}'}): Promise<AxiosResponse<${result}>> =>\n  request<${result}>({ ${configs.join(', ')} });`);
    }
  }

  const needsPath = entries.some((entry) => entry.includes('buildPath('));
  const schemaImport = importedTypes.size ? `import type { ${[...importedTypes].sort().join(', ')} } from '@liangqingda/study-nodejs-schema';\n` : '';
  const imports = entries.length ? `import type { AxiosResponse } from 'axios';\n${schemaImport}import { ${needsPath ? 'buildPath, ' : ''}request } from '@/utils/http';\n\n` : '';
  const client = `/* eslint-disable */\n// Generated from study-nodejs-schema. Do not edit.\n${imports}${entries.join('\n\n')}${entries.length ? '\n' : ''}`;

  return { client };
};

const main = async () => {
  execFileSync('pnpm', ['generate:openapi'], { cwd: schemaRoot, stdio: 'inherit' });
  const document = JSON.parse(await readFile(path.join(schemaRoot, 'openApiJsonFile.json'), 'utf8'));
  const { client } = await generateApiClient(document);

  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'index.ts'), client);
  console.log(`Generated ${Object.keys(document.paths ?? {}).length} API path(s) in src/apis`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
