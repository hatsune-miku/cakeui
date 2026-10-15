import { fileURLToPath } from 'node:url'
import { build } from 'vite'

// Read the actual TypeScript engine in Node without shipping a second implementation.
export async function loadThemeModule() {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      target: 'es2022',
      minify: false,
      lib: { entry: fileURLToPath(new URL('../src/theme/index.ts', import.meta.url)), formats: ['es'] },
    },
  })
  const output = (Array.isArray(result) ? result[0] : result).output
  if (output.length !== 1 || output[0].type !== 'chunk')
    throw new Error('Theme engine must remain a single dependency-free module.')
  return import('data:text/javascript;base64,' + Buffer.from(output[0].code).toString('base64'))
}
