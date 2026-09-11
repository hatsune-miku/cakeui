import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build:
    mode === 'demo'
      ? { outDir: 'demo-dist' }
      : {
          copyPublicDir: false,
          lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
          rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime'],
            output: { banner: "'use client';" },
          },
        },
}))
