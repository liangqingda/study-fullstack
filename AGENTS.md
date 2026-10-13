# Repository conventions

Keep the API, web app, and schema in this pnpm workspace. Do not modify ESLint,
Prettier, TypeScript configuration or build scripts unless the task requires it.
See `apps/web/AGENTS.md` for frontend-specific conventions.

Backend PostgreSQL development and integration use only `study_lab` via
`DATABASE_URL`. Never commit credentials. Before operations that may change data,
confirm `current_database()`; do not clear or rebuild existing data. Unit tests
use injection or mocks by default; explicitly opt in to real database tests.

For learning demos in the **tech** realm, use the repository-level
`.agents/skills/tech-demo/SKILL.md`. Tech demo API routes are three-level
`/api/tech/<原分类>/<demo>/<动作>`（如 `/api/tech/redis/sms-login/login`），对应
schema `apis/tech/<原分类>/<demo>/` 与生成的客户端 `src/apis/tech/<原分类>.ts`，
详见该 skill 的接口契约部分。

Demos are organized **by realm**: each learning realm gets one `<realm>-demo`
skill under `.agents/skills/`（currently only `tech-demo`; a future English realm
would add `english-demo`）. To scaffold a skill for a new realm, follow
`.agents/skills/create-realm-skill/SKILL.md` and trim the generated content to the
realm's nature — coding realms keep the interface-contract / backend / database
baselines; non-coding realms (e.g. language learning) drop the backend contract
and keep only the content / explanation shape, page layout and quality baselines.

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
