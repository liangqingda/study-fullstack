# study-nodejs-schema

Node.js 22+ / pnpm 工作区中的私有 API 契约包。TypeScript 源码使用 ESM `import`/`export`，构建为 CommonJS；不单独发布。

## 安装与构建

```sh
pnpm install
pnpm lint
pnpm build
```

本仓库只提供 API 契约与生成产物，不启动 HTTP 服务。`apis/transactions/` 注册了事务实验接口，包括请求、成功响应和 400/503 错误响应；添加其他契约后运行构建即可生成对应类型与 OpenAPI 文档。

## 添加 API

在 `apis/<feature>/` 放置请求 schema、响应 schema/类型和 `defineApiInfo` 描述，并经 `apis/index.ts` 导出。顶层导出的 `ZodObject` 必须调用 `.openapi('唯一的有效 TypeScript 标识符')`；嵌套命名 object/enum 也会生成引用类型。业务实现优先用 `z.infer<typeof schema>`。`types/api-types.ts` 标记前可以维护 import，`// start of generated types` 后禁止手改。`common/` 只放跨 API 共享内容。

```sh
pnpm generate:apitypes
pnpm generate:openapi
pnpm build
```

生成的 `types/api-types.ts` 会参与编译；OpenAPI 3.1 输出到根目录被忽略的 `openApiJsonFile.json`，构建复制到 `lib/openApiJsonFile.json`。`pnpm build` 自动执行两个生成步骤，失败不会暂改 `types/index.ts`。实现、注册、执行路径及边界见 [架构说明](docs/schema-package.md)。

## 工作区使用

在仓库根目录执行 `pnpm install`，后端与前端通过 `workspace:*` 引用此包。`main`/`types` 指向 `lib/index.js`/`lib/index.d.ts`；子路径 `./apis` 指向 `lib/apis/index.js`。根目录的 `pnpm build` 会先构建本包，再构建前后端。
