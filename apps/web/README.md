# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
# API client generation

`pnpm gen:apis` refreshes the workspace `packages/schema` OpenAPI document and generates TypeScript API callers in `src/apis/index.ts`. Named contract types are imported directly from `@liangqingda/study-nodejs-schema`; no local `types.ts` is generated. Run it after changing API contracts in that package; build the schema package first to refresh its exported types, and commit the generated client alongside frontend changes. Run `pnpm install` at the workspace root. `pnpm test:apis` exercises the generator with representative operations. The transaction page is available at `/postgres/transactions`; it needs the Node service with `DATABASE_URL` pointing to `study_nodejs`.

Use `request<T>` from `src/utils/http` for handwritten calls. It returns the full Axios response (including status and headers); non-2xx responses reject with an Axios error. Generated callers use the same instance and accept an optional `signal` for cancellation. The existing HTTP teaching demos still use `fetch` to preserve their response and redirect observations.

The Vite `/api` proxy targets `http://localhost:3000` by default. If the backend runs elsewhere, set `VITE_API_TARGET` when starting Vite, for example `VITE_API_TARGET=http://localhost:3001 pnpm dev`.
