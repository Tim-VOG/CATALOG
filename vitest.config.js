import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    // Vitest only owns *.test.* under src/. The Playwright suite
    // lives in e2e/ with *.spec.ts files and is driven by a
    // separate runner — keep the boundaries clean so vitest
    // doesn't try to import @playwright/test.
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      // Track coverage on the specific files we actually own with
      // unit tests. The 30+ remaining hooks are thin Supabase
      // wrappers — exercised in e2e + manual QA, not here. If we
      // ever add a meaningful unit test for one of them, add it to
      // the include list and the gate will pick it up.
      include: [
        'src/lib/sanitize.js',
        'src/lib/email-draft.js',
        'src/lib/email-html.js',
        'src/lib/utils/generate-email.js',
        'src/lib/constants/business-units.js',
        'src/services/request-status-service.js',
        'src/hooks/use-paginated.js',
      ],
      exclude: ['**/*.test.{js,jsx,ts,tsx}'],
      // CI gate — protects the Phase-2 floor on the surfaces we
      // explicitly cover. Below this the run fails.
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 60,
      },
    },
  },
})
