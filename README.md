# study-fullstack

Node.js/Express learning service, React/Vite UI, and shared API contracts in one pnpm workspace. Requires Node.js 22+ and pnpm 10.6.1.

| Package | Location | Purpose |
| --- | --- | --- |
| `study-nodejs` | `apps/api` | HTTP service and PostgreSQL learning demos |
| `study-react` | `apps/web` | Interactive demo UI |
| `@liangqingda/study-nodejs-schema` | `packages/schema` | Runtime schemas and generated OpenAPI/types; private workspace package |

```sh
corepack enable
pnpm install
pnpm dev
```

Open `http://localhost:5173`; the API listens on `http://localhost:3000`. `pnpm dev` prepares the schema, API client and routes before starting both services. Schema source changes rebuild the contracts and restart the API; adding or removing pages automatically refreshes routes. If schema generation fails, fix the error and save again to retry. For PostgreSQL demos, put `DATABASE_URL` pointing only to `study_nodejs` in ignored `apps/api/.env`; see `apps/api/.env.example`. The default tests do not need a database. Never commit credentials.

`pnpm sync` refreshes the schema, API client and routes without starting services. Run it after a fresh install before standalone type checks or tests. `pnpm build` synchronizes these files and builds the API and web apps. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` from the root for workspace verification; type checks cover all three packages and API tests, while tests cover API behavior and API/route generation. Package-specific commands and learning notes remain in each package's README. The private ESLint and TypeScript config packages require authorized GitHub Packages access; the root `.npmrc` contains no token.

For an API image, use `docker build -f apps/api/Dockerfile .` from this directory. CI verifies the workspace using a single frozen lockfile.
