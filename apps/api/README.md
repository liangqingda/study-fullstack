# study-nodejs

Express 5 + TypeScript service and learning demos. Node.js >=22 and pnpm 10.6.1 are required.

## Local setup

Install and build once from the workspace root, then in this directory:

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm typecheck:test
pnpm test
pnpm build
pnpm start
```

`pnpm dev` watches TypeScript and restarts the compiled server; `pnpm start:dev` runs TypeScript directly for the existing learning demos. `pnpm build:swc` independently compiles CommonJS JavaScript to `build/` (no declarations or type checking); run `pnpm typecheck` separately. `pnpm build:swc:watch` watches SWC output. `pnpm test:watch` and `pnpm test:coverage` provide interactive and coverage runs. `pnpm start:watch` watches an existing `build/` directory. Production builds exclude tests. The pre-commit hook runs `lint-staged`.

The private ESLint and TypeScript configuration packages require authorized registry access for installation. No registry tokens belong in `.npmrc` or source control. The `.npmrc` file only maps the `@liangqingda` scope to GitHub Packages.

## Configuration

Copy `.env.example` to `.env` for local overrides (do not commit `.env`):

| Variable       | Meaning                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `HTTP_PORT`    | HTTP port, integer 1-65535; defaults to 3000                             |
| `NODE_ENV`     | `development`, `test`, or `production`; defaults to `development`        |
| `LOG_LEVEL`    | Pino level; defaults to `info`                                           |
| `CORS_ORIGINS` | Comma-separated explicit HTTP origins; required in production            |
| `DATABASE_URL` | PostgreSQL connection string; use `study_nodejs` for backend development |

Development defaults to `http://localhost:5173` for the sibling React app; test mode has no cross-origin allowance. Production refuses to start without explicit origins. The existing `/api/middleware/built-in` route deliberately uses its own `express.json()` so that demo still demonstrates route-level parsing; other routes use the application parser. Pino HTTP logging omits URL, query, headers and request body; demo-specific logs correlate operations without printing input secrets. `createApp()` and default tests never open a real database connection; PostgreSQL is enabled only when `DATABASE_URL` is set at startup. Existing `sql/` files remain standalone learning exercises.

## HTTP behavior

```sh
curl -i http://localhost:3000/health
```

The health endpoint returns 200 and `{"status":"ok"}`. Unknown routes return 404, and unexpected errors return sanitized 500 JSON. `/health-check` remains as a compatibility alias.

### PostgreSQL connection and query example

The `pg` dependency alone does not connect the service. Backend development in this repository uses the local `study_nodejs` database: set `DATABASE_URL=postgresql://localhost:5432/study_nodejs` in your ignored `.env` (adjust host/user if needed), then start the service. Never commit credentials. The pool is created once in `src/services/postgres.ts`, connects when a query needs a client, and closes on SIGINT/SIGTERM. The route deliberately needs no tables or migrations:

```sh
curl -i 'http://localhost:3000/api/postgres/ping?value=hello'
curl -i 'http://localhost:3000/api/postgres/ping?value='
```

For the first request, `GET /api/postgres/ping` validates and trims `value`, calls `src/express/postgres/queries.ts`, and runs `SELECT current_database() AS database, $1::text AS echoed` with `['hello']` as a separate parameter. A connected local database returns HTTP 200 and `{"database":"study_nodejs","echoed":"hello"}`. `database` is the name reported by PostgreSQL, not a value hard-coded by Express; `echoed` comes from the parameter bound at `$1`, not SQL string concatenation. The terminal logs the route, query step and outcome, but not the connection string or raw input.

An empty or overlong `value` returns 400 **before** querying. If `DATABASE_URL` is absent, the route returns 503 `PostgreSQL is not configured`; if the configured server cannot be reached or the query fails, it returns 503 `PostgreSQL is unavailable` without exposing connection details. `/health` remains an HTTP-only liveness check and can return 200 while this database route returns 503. For a real multi-statement transaction, obtain **one** client from the pool and release it in `finally`; separate `pool.query()` calls do not guarantee the same client. This example uses one parameterized statement and does not need a transaction or an ORM.

Existing learning endpoints remain under `/api/response-methods/*`, `/api/middleware/*` and `/api/error-handling/*`; the companion React pages can be used to inspect them. The response-methods demo's EJS and sample text are served from their source directory, so run the built service from this repository root with `src/` present. The error-handling demo intentionally illustrates Express's default behavior on some routes, including connection closure after headers were sent; it is separate from the shared application error handler.

The [transaction exercises](src/express/postgres/transactions/README.md) use `psql` to demonstrate rollback, savepoints, snapshot isolation, and serializable conflicts with two sessions. They run separately from the HTTP service and require `DATABASE_URL` to point to `study_nodejs`.

The React page at `/postgres/transactions` also runs six transaction scenarios through `POST /api/transactions/run` with a `{"scenario":"atomicity"}` body. Valid scenarios are `atomicity`, `savepoint`, `read-committed`, `repeatable-read`, `write-skew`, and `serializable`. The request and response schemas live in the workspace `packages/schema` package; build it before running this service from a fresh checkout. A real database request checks `current_database()` first. Single-session scenarios use temporary tables; concurrent scenarios use isolated rows in the two `demo_transactions_*` tables and delete only those rows after collecting results. These examples are teaching demonstrations, not a payment or scheduling service.

## Build and deployment boundary

The workspace CI checks frozen installation, lint, both typechecks, builds, and unit tests. Private package access must be configured before it can pass on a remote runner. The Dockerfile uses the workspace root as its build context (`docker build -f apps/api/Dockerfile .`). Docker also needs authorized access to private packages; no deployment workflow, database, runner secret, registry token, or target address is configured. Verify a health request against the image before deploying.
