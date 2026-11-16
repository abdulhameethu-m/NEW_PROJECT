const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'android/**', 'assets/**'],
  },
  ...compat.extends('expo'),
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
];
