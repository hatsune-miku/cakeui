import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import { compileString } from 'sass'

const root = fileURLToPath(new URL('..', import.meta.url))
const css = compileString(
  `@use 'src/theme/generated' as palette;
.native-light { @include palette.theme('pink', 'light'); }
.native-dark { @include palette.theme('pink', 'dark'); }`,
  { loadPaths: [root] }
).css
const keys = {
  background: 'bg',
  surface: 'surface',
  surfaceStrong: 'surface-strong',
  popup: 'popup',
  control: 'control',
  controlHover: 'control-hover',
  text: 'text',
  muted: 'muted',
  line: 'line',
  accent: 'accent',
  accentSoft: 'accent-soft',
  accentHover: 'accent-hover',
  primaryInk: 'primary-ink',
  danger: 'danger',
  backdrop: 'backdrop',
}
const themes = {}
for (const mode of ['light', 'dark']) {
  const block = css.match(new RegExp(`\\.native-${mode} \\{([^}]+)\\}`))[1]
  const values = Object.fromEntries(
    [...block.matchAll(/--cake-([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2]])
  )
  themes[mode] = Object.fromEntries(Object.entries(keys).map(([name, token]) => [name, values[token]]))
}
const rawOutput =
  '// Generated from CakeUI Web pink theme. Run npm run native:tokens.\nexport const cakeColors = ' +
  JSON.stringify(themes, null, 2) +
  ' as const\n'
const target = root + '/packages/native/src/tokens.ts'
const output = await format(rawOutput, { ...(await resolveConfig(target)), filepath: target })
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('Native tokens are stale. Run npm run native:tokens.')
} else writeFileSync(target, output)
