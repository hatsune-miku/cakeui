import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { compileAsync } from 'sass'

const css = await compileAsync(fileURLToPath(new URL('../src/editor/ui.scss', import.meta.url)), {
  style: 'compressed',
})
await mkdir(new URL('../dist/editor/', import.meta.url), { recursive: true })
await writeFile(new URL('../dist/editor/ui.css', import.meta.url), css.css)
await build({
  entryPoints: [fileURLToPath(new URL('../src/editor/ui.ts', import.meta.url))],
  outfile: fileURLToPath(new URL('../dist/editor/ui.js', import.meta.url)),
  bundle: true,
  format: 'esm',
  target: 'es2022',
})
