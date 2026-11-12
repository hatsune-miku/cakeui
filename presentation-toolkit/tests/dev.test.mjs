import assert from 'node:assert/strict'
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import test from 'node:test'

import { startPreview } from '../dist/dev.js'
import { buildPresentation } from '../dist/index.js'

async function fixture(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'cake-presentation-'))
  t.after(() => {
    assert.equal(dirname(resolve(cwd)), resolve(tmpdir()))
    assert.ok(basename(cwd).startsWith('cake-presentation-'))
    return rm(cwd, { recursive: true, force: true })
  })
  return cwd
}

async function connect(url) {
  const controller = new AbortController()
  const response = await fetch(url + '/__cake_presentation/events', { signal: controller.signal })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let latest
  const listeners = new Set()
  const reading = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        let end
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, end)
          buffer = buffer.slice(end + 2)
          const data = frame.split('\n').find((line) => line.startsWith('data: '))
          if (data) {
            latest = JSON.parse(data.slice(6))
            for (const listener of listeners) listener(latest)
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) throw error
    }
  })()
  return {
    waitFor(predicate) {
      if (latest && predicate(latest)) return Promise.resolve(latest)
      return new Promise((done, fail) => {
        const timer = setTimeout(() => {
          listeners.delete(listener)
          fail(new Error('Timed out waiting for preview update: ' + JSON.stringify(latest)))
        }, 15000)
        const listener = (state) => {
          if (predicate(state)) {
            clearTimeout(timer)
            listeners.delete(listener)
            done(state)
          }
        }
        listeners.add(listener)
      })
    },
    async close() {
      controller.abort()
      await reading
    },
  }
}

test(
  'preview updates dependencies, recovers from errors and keeps final output untouched',
  { timeout: 60000 },
  async (t) => {
    const cwd = await fixture(t)
    const configPath = join(cwd, 'presentation.config.json')
    const config = { entry: 'main.ts', outfile: 'deck.html', title: 'Initial title', minify: false }
    await writeFile(configPath, JSON.stringify(config))
    await writeFile(join(cwd, 'deck.html'), 'existing offline presentation')
    await writeFile(join(cwd, 'copy.json'), '{"heading":"first"}')
    await writeFile(join(cwd, '_colors.scss'), '$accent: #b93d5c;')
    await writeFile(join(cwd, 'style.scss'), '@use "colors"; body { color: colors.$accent; }')
    await writeFile(join(cwd, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><title>old-icon</title></svg>')
    const entry = `import data from './copy.json'; import icon from './icon.svg'; import './style.scss'; document.body.dataset.icon = icon; document.getElementById('app')!.textContent = data.heading;`
    await writeFile(join(cwd, 'main.ts'), entry)
    const preview = await startPreview(configPath, 0)
    const events = await connect(preview.url)
    const second = await connect(preview.url)
    try {
      let current = await events.waitFor((state) => Boolean(state.revision) && !state.error)
      const original = current.revision
      async function changed() {
        current = await events.waitFor((state) => state.revision !== current.revision && !state.error)
        await second.waitFor((state) => state.revision === current.revision)
        return (await fetch(preview.url)).text()
      }
      await writeFile(join(cwd, 'copy.json.tmp'), '{"heading":"updated content"}')
      await rename(join(cwd, 'copy.json.tmp'), join(cwd, 'copy.json'))
      assert.match(await changed(), /updated content/)
      await writeFile(join(cwd, '_colors.scss'), '$accent: #123456;')
      assert.match(await changed(), /#123456/)
      await writeFile(join(cwd, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><title>new-icon</title></svg>')
      assert.match(await changed(), /new-icon/)
      await writeFile(join(cwd, 'main.ts'), 'const broken: = ;')
      await events.waitFor((state) => Boolean(state.error))
      assert.match(await (await fetch(preview.url)).text(), /updated content/)
      await writeFile(join(cwd, 'main.ts'), entry + '\ndocument.body.dataset.fixed = "repaired";')
      assert.match(await changed(), /repaired/)
      await writeFile(join(cwd, '_colors.scss'), '$accent: ;')
      await events.waitFor((state) => Boolean(state.error))
      // Reverting to the last good output clears the overlay, without needing a new revision.
      await writeFile(join(cwd, '_colors.scss'), '$accent: #123456;')
      await events.waitFor((state) => !state.error)
      await writeFile(configPath, '{')
      await events.waitFor((state) => Boolean(state.error))
      await writeFile(join(cwd, 'other.ts'), 'document.body.textContent = "new entry";')
      await writeFile(configPath, JSON.stringify({ ...config, entry: 'other.ts', title: 'Changed title' }))
      const html = await changed()
      assert.match(html, /<title>Changed title<\/title>/)
      assert.match(html, /new entry/)
      assert.match(html, /data-cake-presentation-dev/)
      assert.notEqual(current.revision, original)
      const reconnect = await connect(preview.url)
      try {
        await reconnect.waitFor((state) => state.revision === current.revision)
      } finally {
        await reconnect.close()
      }
      assert.equal((await fetch(preview.url + '/copy.json')).status, 404)
      assert.equal(await readFile(join(cwd, 'deck.html'), 'utf8'), 'existing offline presentation')
      const production = await buildPresentation(config, { cwd, write: false })
      assert.doesNotMatch(production.html, /data-cake-presentation-dev|EventSource|__cake_presentation/)
    } finally {
      await events.close()
      await second.close()
      await preview.close()
    }
  }
)

test('preview starts with a missing configuration and recovers when it is created', { timeout: 20000 }, async (t) => {
  const cwd = await fixture(t)
  const configPath = join(cwd, 'presentation.config.json')
  const preview = await startPreview(configPath, 0)
  const events = await connect(preview.url)
  try {
    await events.waitFor((state) => Boolean(state.error))
    await writeFile(join(cwd, 'main.js'), 'document.body.textContent = "recovered"')
    await writeFile(configPath, JSON.stringify({ entry: 'main.js', outfile: 'deck.html', title: 'Recovered' }))
    await events.waitFor((state) => Boolean(state.revision) && !state.error)
    assert.match(await (await fetch(preview.url)).text(), /Recovered/)
  } finally {
    await events.close()
    await preview.close()
  }
})
