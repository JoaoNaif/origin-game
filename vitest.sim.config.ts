import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.config'

/** Simulações de calibração (`npm run simulate`): fora do `npm test` porque demoram minutos. */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ['scripts/**/*.sim.ts'],
      setupFiles: ['scripts/sim-setup.ts'],
      // cada confronto prende o processo por segundos; forks evita o timeout de RPC dos threads
      pool: 'forks',
    },
  })
)
