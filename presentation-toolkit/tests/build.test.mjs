import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import test from 'node:test'

import { buildPresentation, loadConfig } from '../dist/index.js'

async function fixture(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'cake-presentation-'))
  t.after(() => {
    assert.equal(dirname(resolve(cwd)), resolve(tmpdir()))
    assert.ok(basename(cwd).startsWith('cake-presentation-'))
    return rm(cwd, { recursive: true, force: true })
  })
  return cwd
}

test('bundles imported media, SCSS and script-closing text into one HTML', async (t) => {
  const cwd = await fixture(t)
  await writeFile(join(cwd, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
  await writeFile(join(cwd, 'style.scss'), '$accent: #b93d5c; .sample { color: $accent; background: url(./icon.svg); }')
  await writeFile(
    join(cwd, 'main.ts'),
    `import icon from './icon.svg'; import './style.scss'; document.getElementById('app')!.textContent = '</script><style>bad</style>' + icon;`
  )
  const config = { entry: 'main.ts', outfile: 'deck.html', title: '<Title> "test"', minify: false }
  const result = await buildPresentation(config, { cwd })
  assert.equal(await readFile(join(cwd, 'deck.html'), 'utf8'), result.html)
  assert.match(result.html, /data:image\/svg\+xml/)
  assert.match(result.html, /#b93d5c/)
  assert.match(result.html, /&lt;Title&gt; &quot;test&quot;/)
  assert.equal((result.html.match(/<\/script>/gi) || []).length, 1)
  assert.equal((result.html.match(/<\/style>/gi) || []).length, 2) // one in JS string, one real style closing tag
  assert.equal(result.bytes, Buffer.byteLength(result.html))
})

test('rejects remote CSS resources rather than emitting a network dependency', async (t) => {
  const cwd = await fixture(t)
  await writeFile(join(cwd, 'main.js'), `import './style.css'`)
  await writeFile(join(cwd, 'style.css'), '.sample { background:url(https://example.com/picture.png) }')
  await assert.rejects(
    buildPresentation({ entry: 'main.js', outfile: 'deck.html', title: 'x' }, { cwd }),
    /local import/
  )
})

test('invalid configs and failed builds preserve an existing output', async (t) => {
  const cwd = await fixture(t)
  await writeFile(join(cwd, 'deck.html'), 'existing report')
  await writeFile(
    join(cwd, 'presentation.config.json'),
    '{"entry":"missing.ts","outfile":"deck.html","title":"x","typo":true}'
  )
  await assert.rejects(loadConfig(join(cwd, 'presentation.config.json')), /Unknown configuration/)
  await assert.rejects(buildPresentation({ entry: 'missing.ts', outfile: 'deck.html', title: 'x' }, { cwd }))
  assert.equal(await readFile(join(cwd, 'deck.html'), 'utf8'), 'existing report')
})
