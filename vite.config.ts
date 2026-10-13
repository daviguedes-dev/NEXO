/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // "standalone": um único Nexo.html com tudo embutido (veja scripts/finish-standalone.mjs)
  const standalone = mode === 'standalone'
  return {
    // caminhos relativos: funciona na raiz, em subpastas (ex.: GitHub Pages) e em file://
    base: './',
    plugins: [react()],
    build: standalone
      ? {
          outDir: 'dist-standalone',
          assetsInlineLimit: () => true,
          cssCodeSplit: false,
          modulePreload: false,
          copyPublicDir: false,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : {
          rollupOptions: {
            output: {
              manualChunks: {
                react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
                data: ['dexie', 'dexie-react-hooks'],
                dnd: ['@dnd-kit/core'],
              },
            },
          },
        },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      setupFiles: ['src/test/setup.ts'],
    },
  }
})
