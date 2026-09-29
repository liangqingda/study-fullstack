# Repository conventions

Keep the API, web app, and schema in this pnpm workspace. Do not modify ESLint,
Prettier, TypeScript configuration or build scripts unless the task requires it.
See each package's AGENTS.md for its local conventions.

Backend PostgreSQL development and integration use only `study_nodejs` via
`DATABASE_URL`. Never commit credentials. Before operations that may change data,
confirm `current_database()`; do not clear or rebuild existing data. Unit tests
use injection or mocks by default; explicitly opt in to real database tests.

For learning demos, use `.agents/skills/study-demo/SKILL.md`.

If a task changes repository files, verify and make exactly one commit containing
only that task's changes, unless explicitly told not to commit.
