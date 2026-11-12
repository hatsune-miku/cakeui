import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import test from 'node:test'

import { startEditor } from '../dist/editor/server.js'
import { buildPresentation } from '../dist/index.js'

async function fixture(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'cake-editor-'))
  const schema = {
    version: 1,
    fields: [{ key: 'title', label: '标题', type: 'text', required: true }],
    types: {
      text: { label: '文字页', fields: [{ key: 'items', label: '列表', type: 'list' }] },
      image: { label: '配图页', fields: [{ key: 'image', label: '图片', type: 'image', required: true }] },
    },
  }
  const config = {
    entry: 'main.ts',
    outfile: 'deck.html',
    title: 'Editor test',
    assets: 'assets.json',
    editor: { files: ['one.json', 'two.json'], schema: 'schema.json', assetsDirectory: 'images' },
  }
  await writeFile(join(cwd, 'presentation.config.json'), JSON.stringify(config))
  await writeFile(join(cwd, 'schema.json'), JSON.stringify(schema))
  await writeFile(
    join(cwd, 'one.json'),
    JSON.stringify([{ id: 'first', type: 'text', title: 'First', items: ['Original'] }])
  )
  await writeFile(join(cwd, 'two.json'), JSON.stringify([{ id: 'second', type: 'text', title: 'Second', items: [] }]))
  await writeFile(join(cwd, 'assets.json'), '{}')
  await writeFile(join(cwd, 'deck.html'), 'existing offline deck')
  await writeFile(
    join(cwd, 'main.ts'),
    `import one from './one.json'; import two from './two.json'; import assets from 'cake-presentation:assets'; document.getElementById('app')!.textContent = JSON.stringify([...one,...two]) + JSON.stringify(assets);`
  )
  const editor = await startEditor(join(cwd, 'presentation.config.json'), 0)
  t.after(async () => {
    await editor.close()
    assert.equal(dirname(resolve(cwd)), resolve(tmpdir()))
    assert.ok(basename(cwd).startsWith('cake-editor-'))
    await rm(cwd, { recursive: true, force: true })
  })
  const html = await (await fetch(editor.url)).text()
  const token = html.match(/name="cake-editor-token" content="([^"]+)"/)[1]
  async function api(path, draft, extra = {}) {
    const response = await fetch(editor.url + '/api/' + path, {
      method: draft ? 'POST' : 'GET',
      headers: { 'X-Cake-Editor-Token': token, 'Content-Type': 'application/json', ...extra },
      ...(draft ? { body: JSON.stringify(draft) } : {}),
    })
    return { status: response.status, data: await response.json() }
  }
  return { cwd, editor, api, config }
}

test('draft preview does not write files; saving backs up originals and export remains standalone', async (t) => {
  const { cwd, editor, api } = await fixture(t)
  const original = await readFile(join(cwd, 'one.json'), 'utf8')
  const draft = (await api('state')).data
  draft.documents[0].pages[0].title = 'Edited heading'
  draft.documents[1].pages.unshift(draft.documents[0].pages.pop())
  const preview = await api('preview', draft)
  assert.equal(preview.status, 200)
  const previewHtml = await (await fetch(editor.url + preview.data.url)).text()
  assert.match(previewHtml, /Edited heading/)
  assert.match(previewHtml, /<head><script data-cake-editor-preview-focus>/)
  assert.equal(await readFile(join(cwd, 'one.json'), 'utf8'), original)
  assert.equal(await readFile(join(cwd, 'deck.html'), 'utf8'), 'existing offline deck')
  const saved = await api('save', draft)
  assert.equal(saved.status, 200)
  assert.equal(await readFile(join(cwd, saved.data.backup, 'one.json'), 'utf8'), original)
  const savedSnapshot = JSON.parse(await readFile(join(cwd, saved.data.backup, 'saved-draft.json'), 'utf8'))
  assert.equal(savedSnapshot.draft.documents[1].pages[0].title, 'Edited heading')
  assert.equal(JSON.parse(await readFile(join(cwd, saved.data.backup, 'save-result.json'), 'utf8')).committed, true)
  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'one.json'), 'utf8')), [])
  assert.equal((await api('save', draft)).status, 409)
  const exported = await api('export', saved.data.state)
  assert.equal(exported.status, 200)
  const html = await readFile(join(cwd, 'deck.html'), 'utf8')
  assert.match(html, /Edited heading/)
  assert.doesNotMatch(html, /cake-editor-token|cake-editor-preview-focus|editor-workspace|\/api\/preview|EventSource/)
})

test('image uploads remain staged until save and are embedded through the manifest', async (t) => {
  const { cwd, editor, api, config } = await fixture(t)
  const draft = (await api('state')).data
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOkQAAAAASUVORK5CYII='
  draft.assets.test = 'images/new.png'
  draft.uploads['images/new.png'] = png
  draft.documents[0].pages[0] = { id: 'first', type: 'image', title: 'Screenshot', image: 'test' }
  const preview = await api('preview', draft)
  assert.equal(preview.status, 200, preview.data.error)
  assert.match(await (await fetch(editor.url + preview.data.url)).text(), /data:image\/png;base64/)
  await assert.rejects(readFile(join(cwd, 'images/new.png')))
  const saved = await api('save', draft)
  assert.equal(saved.status, 200, saved.data.error)
  assert.equal((await readFile(join(cwd, 'images/new.png'))).toString('base64'), png)
  const built = await buildPresentation(config, { cwd, write: false })
  assert.match(built.html, /data:image\/png;base64/)
  assert.deepEqual(saved.data.state.uploads, {})
})

test('rejects untrusted requests, unsafe files, invalid pages and concurrent stale saves', async (t) => {
  const { cwd, editor, api } = await fixture(t)
  const draft = (await api('state')).data
  assert.equal((await fetch(editor.url + '/api/state')).status, 403)
  assert.equal((await api('save', draft, { Origin: 'https://example.com' })).status, 403)
  const outside = structuredClone(draft)
  outside.documents[0].file = '../escaped.json'
  assert.equal((await api('save', outside)).status, 400)
  const image = structuredClone(draft)
  image.assets.evil = '../../private.png'
  assert.equal((await api('preview', image)).status, 400)
  const invalid = structuredClone(draft)
  invalid.documents[1].pages[0].id = 'first'
  assert.equal((await api('save', invalid)).status, 400)
  const corrupted = structuredClone(draft)
  corrupted.documents[0].pages[0].items = [1]
  assert.equal((await api('preview', corrupted)).status, 400)
  draft.documents[0].pages[0].title = 'one winner'
  const results = await Promise.all([api('save', draft), api('save', draft)])
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409])
  const latest = (await api('state')).data
  await writeFile(join(cwd, 'two.json'), '[]')
  assert.equal((await api('save', latest)).status, 409)
  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'two.json'), 'utf8')), [])
})

test('a failed preview/build never changes source or previous exported output', async (t) => {
  const { cwd, api } = await fixture(t)
  const original = await readFile(join(cwd, 'one.json'), 'utf8')
  const draft = (await api('state')).data
  draft.documents[0].pages[0].title = 'Do not persist'
  await writeFile(join(cwd, 'main.ts'), 'const broken: = ;')
  assert.equal((await api('export', draft)).status, 500)
  assert.equal(await readFile(join(cwd, 'one.json'), 'utf8'), original)
  assert.equal(await readFile(join(cwd, 'deck.html'), 'utf8'), 'existing offline deck')
})

test('draft checkpoints are read-only to source, survive incomplete fields and reject stale requests', async (t) => {
  const { cwd, api } = await fixture(t)
  const draft = (await api('state')).data
  const original = await readFile(join(cwd, 'one.json'), 'utf8')
  draft.documents[0].pages[0].title = '' // The user is halfway through typing.
  const saved = await api('drafts', { sessionId: 'manual-session', sequence: 2, draft })
  assert.equal(saved.status, 200)
  assert.equal(await readFile(join(cwd, 'one.json'), 'utf8'), original)
  assert.equal((await api('drafts')).data.length, 1)
  assert.equal((await api('drafts/manual-session')).data.draft.documents[0].pages[0].title, '')
  const stale = structuredClone(draft)
  stale.documents[0].pages[0].title = 'Older request'
  assert.equal((await api('drafts', { sessionId: 'manual-session', sequence: 1, draft: stale })).data.ignored, true)
  await api('drafts', { sessionId: 'manual-session', sequence: 3, resolved: true })
  assert.deepEqual((await api('drafts')).data, [])
  await api('drafts', { sessionId: 'manual-session', sequence: 2, draft: stale })
  assert.deepEqual((await api('drafts')).data, [])
  assert.equal((await api('drafts/manual-session')).data.draft.documents[0].pages[0].title, '')
  assert.equal((await api('drafts', { sessionId: '../escaped', sequence: 1, draft })).status, 400)
})

test('saving a recovered draft retires matching old sessions without removing their recovery files', async (t) => {
  const { api } = await fixture(t)
  const draft = (await api('state')).data
  draft.base = structuredClone({ revision: draft.revision, documents: draft.documents, assets: draft.assets })
  draft.documents[0].pages[0].title = 'Recovered manual edit'
  await api('drafts', { sessionId: 'previous-browser-session', sequence: 7, draft })
  assert.equal((await api('save', draft)).status, 200)
  assert.deepEqual((await api('drafts')).data, [])
  const archive = (await api('drafts/previous-browser-session')).data
  assert.equal(archive.resolved, true)
  assert.equal(archive.draft.documents[0].pages[0].title, 'Recovered manual edit')
  draft.documents[0].pages[0].title = 'The other browser continued editing'
  await api('drafts', { sessionId: 'previous-browser-session', sequence: 8, draft })
  assert.equal((await api('drafts')).data.length, 1)
})

test('tree schema previews and saves content while rejecting invalid ancestry', async (t) => {
  const { cwd, api } = await fixture(t)
  const schema = JSON.parse(await readFile(join(cwd, 'schema.json'), 'utf8'))
  schema.parentField = 'parentId'
  await writeFile(join(cwd, 'schema.json'), JSON.stringify(schema))
  const draft = (await api('state')).data
  draft.documents[1].pages[0].parentId = 'first'
  draft.documents[1].pages[0].title = 'Child title'
  assert.equal((await api('preview', draft)).status, 200)
  const saved = await api('save', draft)
  assert.equal(saved.status, 200)
  assert.equal(saved.data.state.documents[1].pages[0].parentId, 'first')
  const orphan = structuredClone(saved.data.state)
  orphan.documents[1].pages[0].parentId = 'missing'
  assert.equal((await api('save', orphan)).status, 400)
  const cyclic = structuredClone(saved.data.state)
  cyclic.documents[0].pages[0].parentId = 'second'
  assert.equal((await api('preview', cyclic)).status, 400)
  assert.equal(JSON.parse(await readFile(join(cwd, 'two.json'), 'utf8'))[0].title, 'Child title')
})
