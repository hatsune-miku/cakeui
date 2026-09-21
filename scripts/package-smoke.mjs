import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { 'artifact-dir': { type: 'string' } } })

const root = fileURLToPath(new URL('..', import.meta.url))
const npmCli = process.env.npm_execpath
assert(npmCli, 'Run this check with npm run test:package.')
const cache = resolve(root, '.cache')
mkdirSync(cache, { recursive: true })
const consumer = mkdtempSync(resolve(cache, 'package-consumer-'))
const result = JSON.parse(
  execFileSync(process.execPath, [npmCli, 'pack', root, '--ignore-scripts', '--pack-destination', consumer, '--json'], {
    cwd: root,
    encoding: 'utf8',
  })
)
const tarball = resolve(consumer, result[0].filename)
assert(result[0].files.some((file) => file.path === 'dist/cakeui.css'))
assert(result[0].files.some((file) => file.path === 'dist/index.d.ts'))
for (const name of ['index.js', 'index.d.ts', 'style.css']) {
  assert(result[0].files.some((file) => file.path === `dist/presentation/${name}`))
}
assert(result[0].files.some((file) => file.path === 'docs/ai.md'))
assert(!result[0].files.some((file) => file.path.startsWith('demo/') || file.path.includes('node_modules')))
writeFileSync(
  resolve(consumer, 'package.json'),
  JSON.stringify({ name: 'cakeui-integration-check', private: true, type: 'module' })
)
// Resolve the host React/toolchain from the ancestor node_modules; install the actual
// packed library offline so this check cannot silently resolve a source alias.
execFileSync(
  process.execPath,
  [npmCli, 'install', tarball, '--ignore-scripts', '--package-lock=false', '--offline', '--legacy-peer-deps'],
  { cwd: consumer, stdio: 'inherit' }
)
writeFileSync(
  resolve(consumer, 'main.tsx'),
  `import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button, CakeProvider, ContextMenu, MenuItem, Dialog, TextBox, Tabs, TabList, Tab, TabPanel, type ButtonProps } from '@a1knla/cakeui'
import '@a1knla/cakeui/style.css'
const props: ButtonProps = { variant: 'primary', type: 'submit' }
const ref = createRef<HTMLInputElement>()
const app = <CakeProvider theme="gold"><TextBox ref={ref} name="name" /><Button {...props}>Save</Button><ContextMenu interactive menuLabel="Actions" menu={<MenuItem>Copy</MenuItem>}>Target</ContextMenu><Tabs value="a"><TabList><Tab value="a">A</Tab></TabList><TabPanel value="a">Content</TabPanel></Tabs><Dialog title="Details" open={false} onOpenChange={() => {}}>Details</Dialog></CakeProvider>
document.querySelector('#app')!.innerHTML = renderToStaticMarkup(createElement('div', null, app))
`
)
const documentation = readFileSync(resolve(consumer, 'node_modules/@a1knla/cakeui/docs/ai.md'), 'utf8')
// A second consumer entry deliberately has no base CSS or CakeProvider.
writeFileSync(
  resolve(consumer, 'presentation.tsx'),
  `import { createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { SlideDeck, Slide, SlideTitle, SlideText, type SlideDeckProps } from '@a1knla/cakeui/presentation'
import '@a1knla/cakeui/presentation/style.css'
const ref = createRef<HTMLDivElement>()
const props: SlideDeckProps = { theme: 'gold', view: 'document', onIndexChange: (index) => console.log(index) }
createRoot(document.querySelector('#app')!).render(<SlideDeck {...props} ref={ref}><Slide aria-label="Consumer"><SlideTitle>Slides</SlideTitle><SlideText>Standalone styles</SlideText></Slide></SlideDeck>)
`
)
const presentationCss = readFileSync(
  resolve(consumer, 'node_modules/@a1knla/cakeui/dist/presentation/style.css'),
  'utf8'
)
assert.match(presentationCss, /\.cake-slide-deck/)
assert(
  !presentationCss.includes(':root') && !presentationCss.includes('.cake-button') && !presentationCss.includes('@page'),
  'Presentation CSS must not include base resets, UI styles, or global print paper rules.'
)
const examples = [...documentation.matchAll(/^```tsx example=([\w-]+)\r?\n([\s\S]*?)^```/gm)]
assert(examples.length > 0, 'Technical documentation must include complete TSX examples.')
for (const [, name, code] of examples) writeFileSync(resolve(consumer, `docs-${name}.tsx`), code)
const reference = readFileSync(resolve(root, 'public/llms-full.txt'), 'utf8')
const publicTypes = reference.match(/## 附录 B\.[\s\S]*?```typescript\r?\n([\s\S]*?)```/)?.[1]
assert(publicTypes, 'The generated public type appendix is missing.')
writeFileSync(resolve(consumer, 'docs-public-types.ts'), publicTypes)
writeFileSync(
  resolve(consumer, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'react-jsx',
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      noUncheckedSideEffectImports: true,
      types: ['vite/client'],
    },
    include: ['*.tsx', 'docs-public-types.ts'],
  })
)
execFileSync(
  process.execPath,
  [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', resolve(consumer, 'tsconfig.json')],
  { cwd: consumer, stdio: 'inherit' }
)
writeFileSync(
  resolve(consumer, 'ssr.mjs'),
  `import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as ui from '@a1knla/cakeui'
import assert from 'node:assert/strict'
assert.equal(Object.keys(ui).length, 48)
assert.match(renderToStaticMarkup(createElement(ui.Button, { variant: 'primary' }, 'Save')), /cake-button/)
console.log('All 48 packed exports load; server rendering works.')
`
)
execFileSync(process.execPath, [resolve(consumer, 'ssr.mjs')], { cwd: consumer, stdio: 'inherit' })
writeFileSync(
  resolve(consumer, 'presentation-ssr.mjs'),
  `import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as presentation from '@a1knla/cakeui/presentation'
import assert from 'node:assert/strict'
assert.equal(Object.keys(presentation).length, 15)
assert.match(renderToStaticMarkup(createElement(presentation.SlideDeck, null, createElement(presentation.Slide, null, 'Hello slides'))), /cake-slide-deck/)
assert.equal(presentation.CakeProvider, undefined)
console.log('All 15 presentation exports load independently; server rendering works.')
`
)
execFileSync(process.execPath, [resolve(consumer, 'presentation-ssr.mjs')], { cwd: consumer, stdio: 'inherit' })
writeFileSync(
  resolve(consumer, 'index.html'),
  '<!doctype html><html><body><div id="app"></div><script type="module" src="/main.tsx"></script></body></html>'
)
writeFileSync(
  resolve(consumer, 'slides.html'),
  '<!doctype html><html><body><div id="app"></div><script type="module" src="/presentation.tsx"></script></body></html>'
)
writeFileSync(
  resolve(consumer, 'vite.config.mjs'),
  'export default { build: { outDir: "build", rollupOptions: { input: { main: "index.html", slides: "slides.html" } } } }'
)
execFileSync(
  process.execPath,
  [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', resolve(consumer, 'vite.config.mjs')],
  { cwd: consumer, stdio: 'inherit' }
)
const packaged = JSON.parse(readFileSync(resolve(consumer, 'node_modules/@a1knla/cakeui/package.json'), 'utf8'))
assert.equal(Object.keys(packaged.dependencies ?? {}).length, 0)
// Retain the same bytes that were installed and tested, only after every check passes.
if (values['artifact-dir']) {
  const artifactDirectory = resolve(root, values['artifact-dir'])
  mkdirSync(artifactDirectory, { recursive: true })
  copyFileSync(tarball, resolve(artifactDirectory, 'package.tgz'))
  writeFileSync(
    resolve(artifactDirectory, 'metadata.json'),
    JSON.stringify({ name: packaged.name, version: packaged.version, integrity: result[0].integrity }, null, 2)
  )
}
console.log(
  `Package check passed: declarations, CSS exports, ESM, SSR, ${examples.length} documentation examples, public type appendix and consumer build.\nArchive: ${tarball}`
)
