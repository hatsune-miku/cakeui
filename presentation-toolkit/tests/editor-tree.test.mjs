import assert from 'node:assert/strict'
import test from 'node:test'

import { mergeDraft } from '../dist/editor/merge.js'
import { editorTree } from '../dist/editor/tree.js'

const page = (id, parentId) => ({ id, type: 'text', title: id, ...(parentId ? { parentId } : {}) })
const documents = (pages) => [{ file: 'pages.json', pages }]
test('tree preorder retains source sibling order, arbitrary depth and root-only counting', () => {
  const tree = editorTree(
    documents([
      page('child', 'root'),
      page('other'),
      page('root'),
      page('grandchild', 'child'),
      page('sibling', 'root'),
    ]),
    'parentId'
  )
  assert.deepEqual(
    tree.roots.map((n) => n.page.id),
    ['other', 'root']
  )
  assert.deepEqual(
    tree.order.map((n) => [n.page.id, n.number]),
    [
      ['other', '01'],
      ['root', '02'],
      ['child', '02.1'],
      ['grandchild', '02.1.1'],
      ['sibling', '02.2'],
    ]
  )
  assert.deepEqual(
    tree.byId.get('grandchild').ancestors.map((n) => n.page.id),
    ['root', 'child']
  )
})
test('rejects orphans, duplicate ids and rootless cycles instead of dropping pages', () => {
  for (const pages of [
    [page('a', 'missing')],
    [page('a'), page('a')],
    [page('a', 'a')],
    [page('a', 'b'), page('b', 'a')],
  ])
    assert.throws(() => editorTree(documents(pages), 'parentId'))
})
test('a manual draft made before tree migration merges text without losing new parent relationships', () => {
  const base = { revision: 'before', documents: documents([page('a'), page('b')]), assets: {} }
  const draft = { ...structuredClone(base), base: structuredClone(base), uploads: {} }
  draft.documents[0].pages[1].title = 'Manual title'
  const source = {
    ...structuredClone(base),
    revision: 'after',
    schema: { fields: [], types: { text: { fields: [] } } },
  }
  source.documents[0].pages[1].parentId = 'a'
  const result = mergeDraft(draft, source)
  assert.equal(result.conflicts.length, 0)
  assert.equal(result.draft.documents[0].pages[1].title, 'Manual title')
  assert.equal(result.draft.documents[0].pages[1].parentId, 'a')
})
