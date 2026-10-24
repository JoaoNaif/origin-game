import { defineConfig } from 'vitest/config'
import swc from 'unplugin-swc'
import tsConfigPaths from 'vite-tsconfig-paths'

// Testes de ponta a ponta (HTTP + Postgres): cada arquivo roda num schema próprio (test/setup-e2e.ts).
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-e2e.ts'],
    maxWorkers: 4,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
  plugins: [
    tsConfigPaths(),
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
})
