# Schema 包的生成与发布链路

## 目标与职责

契约源码按职责分为 `apis/`（接口描述与请求/响应契约）、`types/`（手写类型和生成类型）、`common/`（可复用守卫）、`scripts/`（构建期生成器）。根 `index.ts` 聚合三个公共入口。源文件用 ESM 语法书写，TypeScript 编译目标为 ES2015，模块格式为 CommonJS，并生成声明文件与 source map。Node 按 `moduleResolution: Node` 查找依赖；TypeScript 6 对 `baseUrl` 与旧 Node resolution 发出弃用诊断，因此当前配置设 `ignoreDeprecations: "6.0"`，将来升级 TypeScript 7 前须迁移。

## 契约如何消费

`defineApiInfo` 用于集中描述 HTTP 方法、路径、请求体、成功及错误响应、摘要和标签；请求体默认必填，可显式设置 `bodyRequired: false`。未指定的 `retry` 和 `requiresAuth` 默认为 `false`。这两个字段是给消费者的契约元数据，不会自动实现重试或鉴权。定义 ApiInfo 也不会自动注册路由或校验请求；消费方须实现 HTTP 路由并调用请求 schema 进行校验。当前注册了事务实验接口。

## 生成的两条路径

1. `generate:apitypes` 从 `common/index.ts` 和 `apis/index.ts` 的命名导出查找顶层 `ZodObject`；未命名立即报错。遍历 object 字段及 array、optional、nullable、default、union，收集命名 object/enum，使用 `zod-to-ts` 的 `zodToTs`、`createTypeAlias`、`printNode` 输出别名。嵌套的具名 schema 用类型引用，而匿名节点内联；去掉生成文本冗余 `| undefined`。只替换 `types/api-types.ts` 标记后的内容，前面的手写 import 保留。当前遍历覆盖上述容器；其他复杂 Zod wrapper（例如 transform/lazy/intersection）需要按实际语义扩展，不会被静默宣称支持。
2. `generate:openapi` 收集 `ApiInfo`，把 method/path/tags/summary/query/params/body/response/errorResponses 交给 `OpenAPIRegistry.registerPath`，由 `OpenApiGeneratorV31` 生成 3.1 JSON。`info.version` 直接读取 `package.json`，因此不需要把版本临时写入类型入口。当前文档包含 `/api/transactions/run`。

`prebuild` 依次运行生成器；`build` 清理旧 `lib/` 并调用 `tsc`；`postbuild` 复制 JSON 到 `lib/`，移除编译期的 `lib/scripts/`。相较于“先改 `types/index.ts`、失败后恢复”的做法，生成器不修改该文件，故编译失败也不会遗留临时版本修改。根目录 JSON 是忽略的可再生文件，生成类型是受版本控制的契约，生成失败时需查看生成类型差异。`files: ["lib"]` 限制包内容；发布前 `prepack` 重新构建。

## 边界

OpenAPI 描述仅包含标准 HTTP 契约，不把 `retry` / `requiresAuth` 自动映射成 OpenAPI security 或客户端执行策略。包类型入口和 `./apis` 子路径提供给消费者；本仓库不提供 HTTP 服务。GitHub Packages 的发布需要个人 token 或 CI 凭据，仓库不会保存令牌。
