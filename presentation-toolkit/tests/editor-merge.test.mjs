import assert from 'node:assert/strict'
import test from 'node:test'

import { mergeDraft, sourceBase } from '../dist/editor/merge.js'

function fixture() {
  const source = {
    projectId: 'test',
    revision: 'original',
    title: 'Example',
    assets: {},
    uploads: {},
    schema: { fields: [{ key: 'title', label: '标题' }], types: { text: { fields: [] } } },
    documents: [
      {
        file: 'pages.json',
        pages: [
          { id: 'a', type: 'text', title: 'A', notes: 'Original', rows: [['one', 'two']] },
          { id: 'b', type: 'text', title: 'B', notes: 'Original B' },
        ],
      },
      { file: 'other.json', pages: [] },
    ],
  }
  const local = { ...sourceBase(source), uploads: {}, base: sourceBase(source) }
  return { source, local }
}

test('keeps manual fields, unrelated external changes, added pages and unknown fields', () => {
  const { source, local } = fixture()
  local.documents[0].pages[0].title = 'Manual heading'
  local.documents[0].pages[0].custom = { retain: true }
  source.documents[0].pages[0].notes = 'Assistant changes a different field'
  source.documents[0].pages.push({ id: 'c', type: 'text', title: 'New page' })
  source.revision = 'new-source'
  const result = mergeDraft(local, source)
  assert.deepEqual(result.conflicts, [])
  assert.equal(result.draft.documents[0].pages[0].title, 'Manual heading')
  assert.equal(result.draft.documents[0].pages[0].notes, 'Assistant changes a different field')
  assert.deepEqual(result.draft.documents[0].pages[0].custom, { retain: true })
  assert.deepEqual(
    result.draft.documents[0].pages.map((p) => p.id),
    ['a', 'b', 'c']
  )
  assert.equal(result.draft.revision, 'new-source')
  assert.deepEqual(result.draft.base, sourceBase(source))
})

test('conflicting fields and table arrays require choices; neither source input is mutated', () => {
  const { source, local } = fixture()
  local.documents[0].pages[0].title = 'Manual'
  source.documents[0].pages[0].title = 'Assistant'
  local.documents[0].pages[0].rows[0][0] = 'Manual row'
  source.documents[0].pages[0].rows.reverse()
  source.documents[0].pages[0].rows[0][1] = 'Assistant cell'
  const before = structuredClone({ source, local })
  const result = mergeDraft(local, source)
  assert.deepEqual(
    result.conflicts.map((c) => c.key),
    ['page:a:title', 'page:a:rows']
  )
  assert.equal(result.draft.documents[0].pages[0].title, 'Manual')
  const resolved = mergeDraft(local, source, { 'page:a:title': 'draft', 'page:a:rows': 'source' })
  assert.deepEqual(resolved.conflicts, [])
  assert.equal(resolved.draft.documents[0].pages[0].title, 'Manual')
  assert.deepEqual(resolved.draft.documents[0].pages[0].rows, source.documents[0].pages[0].rows)
  assert.deepEqual({ source, local }, before)
})

test('deletion cannot silently remove the other side’s edited page', () => {
  const { source, local } = fixture()
  local.documents[0].pages[0].title = 'Keep my edit'
  source.documents[0].pages.shift()
  assert.deepEqual(
    mergeDraft(local, source).conflicts.map((c) => c.key),
    ['page:a']
  )
  assert.equal(mergeDraft(local, source, { 'page:a': 'draft' }).draft.documents[0].pages[0].title, 'Keep my edit')
  assert.deepEqual(
    mergeDraft(local, source, { 'page:a': 'source' }).draft.documents[0].pages.map((p) => p.id),
    ['b']
  )
})

test('manual reorder and cross-chapter moves preserve external text changes', () => {
  const { source, local } = fixture()
  local.documents[0].pages.reverse()
  source.documents[0].pages[0].notes = 'External note'
  let result = mergeDraft(local, source)
  assert.deepEqual(result.conflicts, [])
  assert.deepEqual(
    result.draft.documents[0].pages.map((p) => p.id),
    ['b', 'a']
  )
  assert.equal(result.draft.documents[0].pages[1].notes, 'External note')
  local.documents[1].pages.push(local.documents[0].pages.pop())
  result = mergeDraft(local, source)
  assert.deepEqual(result.conflicts, [])
  assert.equal(result.draft.documents[1].pages[0].notes, 'External note')
})

test('a selected order does not discard additions from the other side', () => {
  const { source, local } = fixture()
  local.documents[0].pages.push({ id: 'c', type: 'text', title: 'Manual new page' })
  source.documents[0].pages.push({ id: 'd', type: 'text', title: 'External new page' })
  const result = mergeDraft(local, source, { 'order:pages.json': 'draft' })
  assert.deepEqual(result.conflicts, [])
  assert.deepEqual(new Set(result.draft.documents[0].pages.map((p) => p.id)), new Set(['a', 'b', 'c', 'd']))
})

test('legacy drafts with a changed revision require a decision for every difference', () => {
  const { source, local } = fixture()
  delete local.base
  local.documents[0].pages[0].title = 'Old manual draft'
  source.revision = 'new'
  source.documents[0].pages[1].notes = 'New source note'
  source.documents[0].pages.push({ id: 'c', type: 'text', title: 'Added since draft' })
  const result = mergeDraft(local, source)
  assert.equal(result.legacy, true)
  assert.ok(result.conflicts.some((c) => c.key === 'page:a:title'))
  assert.ok(result.conflicts.some((c) => c.key === 'page:b:notes'))
  assert.ok(result.conflicts.some((c) => c.key === 'page:c'))
})

test('staged uploads survive, but already saved image files are not uploaded again', () => {
  const { source, local } = fixture()
  source.assetsManifest = 'content/assets.json'
  local.assets.new = '../images/new.png'
  local.uploads['images/new.png'] = 'new-base64'
  local.assets.saved = '../images/saved.png'
  local.uploads['images/saved.png'] = 'saved-base64'
  source.assets.saved = '../images/saved.png'
  const result = mergeDraft(local, source)
  assert.deepEqual(result.conflicts, [])
  assert.deepEqual(result.draft.uploads, { 'images/new.png': 'new-base64' })
  assert.deepEqual({ ...result.draft.assets }, { new: '../images/new.png', saved: '../images/saved.png' })
})
