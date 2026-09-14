import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { type PreviewServer, type ViteDevServer, defineConfig } from 'vite'

import react from '@vitejs/plugin-react'

function serveDocumentation(server: ViteDevServer | PreviewServer, directory: string) {
  server.middlewares.use(async (request, response, next) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    if (!/^\/llms(?:-[a-z0-9-]+)?\.txt$/.test(path)) return next()
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
    response.setHeader('Cache-Control', 'no-cache')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.statusCode = 405
      response.setHeader('Allow', 'GET, HEAD')
      response.end('Method not allowed')
      return
    }
    let content: Buffer | string
    try {
      content = await readFile(resolve(directory, path.slice(1)))
    } catch (error) {
      response.statusCode = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500
      content = response.statusCode === 404 ? 'Document not found' : 'Document unavailable'
    }
    response.end(request.method === 'HEAD' ? undefined : content)
  })
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'cakeui-plaintext-docs',
      configureServer: (server) => serveDocumentation(server, server.config.publicDir),
      configurePreviewServer: (server) =>
        serveDocumentation(server, resolve(server.config.root, server.config.build.outDir)),
    },
  ],
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
