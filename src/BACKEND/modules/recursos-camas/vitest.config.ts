import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('../../../../', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../../../../src', import.meta.url)) },
  },
  // Evitar que la compilación de la configuración escriba en node_modules global.
  cacheDir: fileURLToPath(new URL('./node_modules/.vite', import.meta.url)),
  test: {
    environment: 'node',
    include: [
      'src/BACKEND/modules/recursos-camas/tests/**/*.test.ts',
      'src/FRONTEND/modules/recursos-camas/__tests__/**/*.test.ts',
    ],
  },
})
