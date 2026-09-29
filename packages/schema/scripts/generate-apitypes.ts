import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { getRefId } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { createAuxiliaryTypeStore, createTypeAlias, printNode, zodToTs, type TypeOverrideMap } from 'zod-to-ts';
import * as ts from 'typescript';

import * as apis from '../apis';
import * as common from '../common';
import { isZodObject } from '../common';

const marker = '// start of generated types';
const target = resolve(__dirname, '../types/api-types.ts');
const original = readFileSync(target, 'utf8');
const markerIndex = original.indexOf(marker);

if (markerIndex < 0 || original.indexOf(marker, markerIndex + marker.length) >= 0) {
  throw new Error(`Expected exactly one ${marker} marker in ${target}`);
}

const named = new Map<z.core.$ZodType, string>();
const names = new Set<string>();
const visited = new Set<z.core.$ZodType>();

function visit(schema: z.core.$ZodType): void {
  if (visited.has(schema)) {return;}

  visited.add(schema);
  const name = getRefId(schema as z.ZodType);

  if (name && (schema instanceof z.ZodObject || schema instanceof z.ZodEnum)) {
    const scanner = ts.createScanner(ts.ScriptTarget.ES2015, false, ts.LanguageVariant.Standard, name);

    if (scanner.scan() !== ts.SyntaxKind.Identifier || scanner.scan() !== ts.SyntaxKind.EndOfFileToken || names.has(name)) {
      throw new Error(`Invalid or duplicate OpenAPI type name: ${name}`);
    }

    names.add(name);
    named.set(schema, name);
  }

  if (schema instanceof z.ZodObject) {
    Object.values(schema.shape).forEach(visit);
  } else if (schema instanceof z.ZodArray) {
    visit(schema.element);
  } else if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable || schema instanceof z.ZodDefault) {
    visit(schema.unwrap());
  } else if (schema instanceof z.ZodUnion) {
    schema.options.forEach(visit);
  }
}

for (const [key, value] of Object.entries({ ...common, ...apis })) {
  if (!isZodObject(value)) {continue;}

  if (!getRefId(value)) {throw new Error(`Top-level ZodObject ${key} is missing .openapi(name)`);}

  visit(value);
}

const overrides: TypeOverrideMap = new Map();

for (const [schema, name] of named) {
  overrides.set(schema, (typescript) => typescript.factory.createTypeReferenceNode(name));
}

const auxiliaryTypeStore = createAuxiliaryTypeStore();
const declarations = Array.from(named, ([schema, name]) => {
  const nestedOverrides: TypeOverrideMap = new Map(Array.from(overrides).filter(([other]) => other !== schema));
  const { node } = zodToTs(schema, { auxiliaryTypeStore, overrides: nestedOverrides });

  return `export ${printNode(createTypeAlias(node, name))}`;
});

const auxiliary = Array.from(auxiliaryTypeStore.definitions.values(), ({ node }) => printNode(node));
const generated = [...auxiliary, ...declarations].join('\n\n').replace(/\s*\| undefined\b/g, '');
const next = `${original.slice(0, markerIndex + marker.length)}\n${generated ? `/* eslint-disable quotes */\n${generated}` : 'export {};'}\n`;

if (next !== original) {writeFileSync(target, next);}

console.info(`Generated ${declarations.length} named types`);
