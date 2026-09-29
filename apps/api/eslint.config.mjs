import nodeTypedConfig from '@liangqingda/eslint-config/node-typed';

export default [
  ...nodeTypedConfig,
  {
    files: ['tests/**/*.ts'],
    languageOptions: { parserOptions: { projectService: false, project: './tsconfig.test.json' } },
  },
  { ignores: ['build/**', 'coverage/**', 'eslint.config.mjs', '.prettierrc.cjs'] },
];
