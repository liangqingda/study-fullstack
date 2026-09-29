import nodeTypedConfig from '@liangqingda/eslint-config/node-typed';

export default [
  ...nodeTypedConfig,
  {
    ignores: ['build/**', 'eslint.config.js', '.prettierrc.js'],
  },
];
