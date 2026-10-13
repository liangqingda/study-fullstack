import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { getRefId } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  createAuxiliaryTypeStore,
  createTypeAlias,
  printNode,
  zodToTs,
  type TypeOverrideMap,
} from 'zod-to-ts';
import * as ts from 'typescript';

import * as apis from '../apis';
import { isZodObject } from '../common';

const marker = '// start of generated types';
const exportMarker = '// start of generated exports';
const typesDir = resolve(__dirname, '../types');
const apisDir = resolve(__dirname, '../apis');

/**
 * 写入生成内容：保留 marker 之前的手写头部，仅替换 marker 之后的部分。
 * 首次生成（文件不存在或无 marker）时从 marker 开始整写。
 * 生成代码的格式由脚本串联的 prettier 统一处理（见 generate:apitypes），
 * 因此这里不写入 eslint-disable 豁免。
 */
const writeGenerated = (
  target: string,
  fileMarker: string,
  generated: string,
): void => {
  let original = '';

  try {
    original = readFileSync(target, 'utf8');
  } catch {
    // 新文件
  }

  const idx = original.indexOf(fileMarker);
  const body = generated ? generated : 'export {};';

  let next: string;

  if (idx < 0) {
    next = `${fileMarker}\n${body}\n`;
  } else {
    if (original.indexOf(fileMarker, idx + fileMarker.length) >= 0) {
      throw new Error(`Expected exactly one ${fileMarker} marker in ${target}`);
    }

    next = `${original.slice(0, idx + fileMarker.length)}\n${body}\n`;
  }

  if (next !== original) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, next);
  }
};

/**
 * 扫描 apis 目录下各层级的 index.ts 中的 `.openapi('Name')`，
 * 建立 类型名 -> "相对 apis 的路径" 的映射，据此把生成的类型拆到对应文件。
 * 支持多层分类（如 `tech/postgres/transactions`），rel 为该目录相对 apis 的路径。
 */
const nameToDemo = new Map<string, string>();

const scanIndexFiles = (dir: string, baseRel: string): void => {
  const entries = readdirSync(dir, { withFileTypes: true });

  if (
    baseRel &&
    entries.some((entry) => entry.isFile() && entry.name === 'index.ts')
  ) {
    const indexPath = join(dir, 'index.ts');
    let source: string;

    try {
      source = readFileSync(indexPath, 'utf8');
    } catch {
      return;
    }

    const re = /\.openapi\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match: RegExpExecArray | null;

    while ((match = re.exec(source)) !== null) {
      nameToDemo.set(match[1], baseRel);
    }

    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'model') {
      continue;
    }

    scanIndexFiles(
      join(dir, entry.name),
      baseRel ? `${baseRel}/${entry.name}` : entry.name,
    );
  }
};

scanIndexFiles(apisDir, '');

const named = new Map<z.core.$ZodType, string>();
const names = new Set<string>();
const visited = new Set<z.core.$ZodType>();

function visit(schema: z.core.$ZodType): void {
  if (visited.has(schema)) {
    return;
  }

  visited.add(schema);
  const name = getRefId(schema as z.ZodType);

  if (name && (schema instanceof z.ZodObject || schema instanceof z.ZodEnum)) {
    const scanner = ts.createScanner(
      ts.ScriptTarget.ES2015,
      false,
      ts.LanguageVariant.Standard,
      name,
    );

    if (
      scanner.scan() !== ts.SyntaxKind.Identifier ||
      scanner.scan() !== ts.SyntaxKind.EndOfFileToken ||
      names.has(name)
    ) {
      throw new Error(`Invalid or duplicate OpenAPI type name: ${name}`);
    }

    names.add(name);
    named.set(schema, name);
  }

  if (schema instanceof z.ZodObject) {
    Object.values(schema.shape).forEach(visit);
  } else if (schema instanceof z.ZodArray) {
    visit(schema.element);
  } else if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault
  ) {
    visit(schema.unwrap());
  } else if (schema instanceof z.ZodUnion) {
    schema.options.forEach(visit);
  }
}

for (const [, value] of Object.entries(apis)) {
  if (!isZodObject(value)) {
    continue;
  }

  if (!getRefId(value)) {
    throw new Error('Top-level ZodObject is missing .openapi(name)');
  }

  visit(value);
}

// 按类型名归属把 named 分组到各 demo 文件。
const groups = new Map<string, Map<z.core.$ZodType, string>>();

for (const [schema, name] of named) {
  const demo = nameToDemo.get(name);

  if (!demo) {
    throw new Error(`Cannot determine target file for type "${name}"`);
  }

  const group = groups.get(demo) ?? new Map<z.core.$ZodType, string>();

  group.set(schema, name);
  groups.set(demo, group);
}

for (const [demo, groupNamed] of groups) {
  const overrides: TypeOverrideMap = new Map();

  for (const [schema, name] of groupNamed) {
    overrides.set(schema, (typescript) =>
      typescript.factory.createTypeReferenceNode(name),
    );
  }

  const auxiliaryTypeStore = createAuxiliaryTypeStore();
  const declarations = Array.from(groupNamed, ([schema, name]) => {
    const nestedOverrides: TypeOverrideMap = new Map(
      Array.from(overrides).filter(([other]) => other !== schema),
    );
    const { node } = zodToTs(schema, {
      auxiliaryTypeStore,
      overrides: nestedOverrides,
    });

    // 顶层 schema 的 describe 映射为 type alias 前的 JSDoc，保持与手写文件一致。
    const { description } = schema as { description?: string };
    const prefix = description
      ? `/**\n * ${description.replace(/\s*\n\s*/g, '\n * ')}\n */\n`
      : '';

    return `${prefix}export ${printNode(createTypeAlias(node, name))}`;
  });
  const auxiliary = Array.from(
    auxiliaryTypeStore.definitions.values(),
    ({ node }) => printNode(node),
  );
  const generated = [...auxiliary, ...declarations]
    .join('\n\n')
    .replace(/\s*\| undefined\b/g, '')
    // TypeScript printer 固定用 4 空格缩进；统一收敛为仓库风格的 2 空格。
    .split('\n')
    .map((line) => {
      const indent = line.match(/^( +)/)?.[1].length ?? 0;

      if (indent % 4 !== 0) {
        return line;
      }

      return `${' '.repeat(indent / 2)}${line.slice(indent)}`;
    })
    .join('\n');

  writeGenerated(join(typesDir, `${demo}.ts`), marker, generated);
}

// 更新 types/index.ts 的聚合导出（稳定排序；不用被禁的原地 .sort()）。
const sortStrings = (values: readonly string[]): string[] => {
  let sorted: string[] = [];

  for (const value of values) {
    const index = sorted.findIndex((entry) => entry.localeCompare(value) > 0);

    sorted =
      index < 0
        ? [...sorted, value]
        : [...sorted.slice(0, index), value, ...sorted.slice(index)];
  }

  return sorted;
};

const indexExports = sortStrings(Array.from(groups.keys()))
  .map((demo) => `export * from './${demo}';`)
  .join('\n\n');

writeGenerated(join(typesDir, 'index.ts'), exportMarker, indexExports);

let total = 0;

for (const group of groups.values()) {
  total += group.size;
}

console.info(`Generated ${total} named types across ${groups.size} file(s)`);
