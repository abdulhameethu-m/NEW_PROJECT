const js = require('@eslint/js');
const globals = require('globals');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    },
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      'no-unused-vars': 'off', // handled by unused-imports
      "unused-imports/no-unused-vars": "off",
      "no-console": "off",
      "no-undef": "off",
      "no-empty": "off",
      "no-empty-pattern": "off",
      "no-useless-assignment": "off",
      "no-unreachable": "off",
      "no-dupe-keys": "off",
      "no-control-regex": "off",
      "preserve-caught-error": "off"
    }
  }
];
