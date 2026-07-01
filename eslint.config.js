// ESLint flat config — minimal but enforced in CI.
//
// Goals:
//   * Catch unused vars, missing dependencies in hooks, dangling
//     await / promise (the kind of bug that landed us blank
//     pages in production), wrong React import paths.
//   * No 'console.log' in shipped code; warn-only on .test files.
//   * Stay quiet on stylistic noise — Prettier / our existing style
//     handles that, the linter shouldn't compete.
//
// Apply with:  npx eslint . --max-warnings=0

import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      'supabase/functions/**',
      'scripts/csv-to-sql.js',
      'public',
      '*.cjs',
      'e2e',
      'playwright-report',
      'test-results',
      'playwright.config.ts',
    ],
  },
  js.configs.recommended,
  // TypeScript: parser + recommended (non type-checked, fast).
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: { react: { version: '18.2' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // 'any' is used liberally during the Phase-3 migration to land
      // the TS toolchain without typing every callsite. The follow-up
      // pass tightens them per-file as @ts-nocheck banners come off.
      '@typescript-eslint/no-explicit-any': 'off',
      // @ts-nocheck is acceptable during the Phase-3 migration —
      // each file marked with it is tracked as a follow-up to type
      // properly. Re-tighten to 'error' (or 'allow-with-description')
      // once the per-file pass is done.
      '@typescript-eslint/ban-ts-comment': 'off',
      // Bare `require()` shows up in vite/vitest configs we don't
      // own — keep quiet.
      '@typescript-eslint/no-require-imports': 'off',
      // The codebase uses interface and Function-style types in
      // a few stores; not worth fighting during the migration.
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: { react: { version: '18.2' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      'react/prop-types': 'off',          // no PropTypes in this codebase
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // No console.log in shipped code; warn / error / debug allowed.
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],

      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],

      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-prototype-builtins': 'off',
      'no-async-promise-executor': 'warn',
    },
  },
  {
    files: ['**/*.test.{js,jsx,mjs}', 'src/test/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
]
