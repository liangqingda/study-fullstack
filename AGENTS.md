# Repository conventions

Keep the API, web app, and schema in this pnpm workspace. Do not modify ESLint,
Prettier, TypeScript configuration or build scripts unless the task requires it.
See `apps/web/AGENTS.md` for frontend-specific conventions.

Backend PostgreSQL development and integration use only `study_nodejs` via
`DATABASE_URL`. Never commit credentials. Before operations that may change data,
confirm `current_database()`; do not clear or rebuild existing data. Unit tests
use injection or mocks by default; explicitly opt in to real database tests.

For learning demos, use the repository-level `.agents/skills/study-demo/SKILL.md`. API 路由路径统一为两层 `/api/<分类>/<demo>/...`（如 `/api/redis/sms-login/login`），对应 schema `apis/<分类>/<demo>/` 与生成的客户端 `src/apis/<分类>/<demo>.ts`，详见该 skill 的接口契约部分。

## Code documentation

All extracted or shared code — constants, utils, types, schema contracts, common
modules — must carry JSDoc comments. Type-level and function-level JSDoc uses
multi-line blocks:

```ts
/**
 * Does one thing and returns it.
 */
export const helper = () => {};
```

Object type properties use single-line JSDoc above each field:

```ts
export type User = {
  /** Unique user id. */
  id: string;
  /** Display name. */
  name: string;
};
```

Generated files (e.g. `packages/schema/types/api-types.ts`) are excluded.

Services you start for a task (dev/preview servers, background processes,
databases, etc.) must be stopped before you report the task complete. Only stop
the processes you started; never kill another agent's, another project's, or
the user's own processes.

If a task changes repository files, verify and make exactly one commit containing
only that task's changes, unless explicitly told not to commit.
