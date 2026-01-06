import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const vitestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  vi: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
};

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'dist-electron/**',
      '**/*.min.js',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
      'packages/ui/playwright-report/**',
      'test-results/**',
      'frontend/public/**',
      'main/dist/**',
      'backend/**',
    ],
  },

  {
    files: ['**/*.{js,cjs,mjs}'],
    ...js.configs.recommended,
  },

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Prefer TypeScript's analysis for these.
      'no-undef': 'off',
      'no-unused-vars': 'off',

      // Keep TS-focused rules permissive until the codebase is cleaned up.
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...vitestGlobals,
      },
    },
  },

  {
    files: ['packages/ui/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...reactRefresh.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
];
