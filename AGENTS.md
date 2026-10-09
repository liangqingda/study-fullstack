# Repository conventions

Keep the API, web app, and schema in this pnpm workspace. Do not modify ESLint,
Prettier, TypeScript configuration or build scripts unless the task requires it.
See `apps/web/AGENTS.md` for frontend-specific conventions.

Backend PostgreSQL development and integration use only `study_nodejs` via
`DATABASE_URL`. Never commit credentials. Before operations that may change data,
confirm `current_database()`; do not clear or rebuild existing data. Unit tests
use injection or mocks by default; explicitly opt in to real database tests.

For learning demos, use the repository-level `.agents/skills/study-demo/SKILL.md`.

Services you start for a task (dev/preview servers, background processes,
databases, etc.) must be stopped before you report the task complete. Only stop
the processes you started; never kill another agent's, another project's, or
the user's own processes.

If a task changes repository files, verify and make exactly one commit containing
only that task's changes, unless explicitly told not to commit.
