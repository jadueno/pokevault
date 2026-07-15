/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Sin esto, vitest también recoge (y falla) los tests del backend al correr
    // desde la raíz del proyecto: son un proyecto Node aparte, con su propia BD de test.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
