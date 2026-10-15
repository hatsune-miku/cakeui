import type { EditorBase, EditorDraft, EditorPage, EditorState } from './types.js'

export interface EditorConflict {
  key: string
  label: string
  draft: unknown
  source: unknown
}
export type EditorChoices = Record<string, 'draft' | 'source'>

export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => sameValue(value, b[i]))
    )
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && sameValue(left[key], right[key]))
  )
}

export function sourceBase(state: EditorBase): EditorBase {
  return structuredClone({ revision: state.revision, documents: state.documents, assets: state.assets })
}

/** Arrays are atomic: without row IDs, matching by index could confuse a reorder with an edit. */
export function mergeDraft(local: EditorDraft, source: EditorState, choices: EditorChoices = {}) {
  const knownBase = !!local.base || local.revision === source.revision
  const base = local.base || sourceBase(source)
  const files = source.documents.map((document) => document.file)
  if (
    !sameValue(
      local.documents.map((document) => document.file),
      files
    ) ||
    !sameValue(
      base.documents.map((document) => document.file),
      files
    )
  )
    throw new Error('章节文件配置已改变，草稿仍已保留；请下载草稿后按新的章节结构合并。')
  const conflicts: EditorConflict[] = []
  function choose<T>(key: string, label: string, original: T, draft: T, current: T): T {
    if (sameValue(draft, current)) return draft
    if (knownBase && sameValue(draft, original)) return current
    if (knownBase && sameValue(current, original)) return draft
    if (choices[key]) return choices[key] === 'draft' ? draft : current
    conflicts.push({ key, label, draft, source: current })
    return draft
  }
  type Entry = { file: string; page: EditorPage }
  function entries(content: EditorBase) {
    return new Map(
      content.documents.flatMap((document) =>
        document.pages.map((page) => [page.id, { file: document.file, page }] as const)
      )
    )
  }
  const before = entries(base)
  const ours = entries(local)
  const theirs = entries(source)
  const combined = new Map<string, Entry>()
  const ids = new Set([...before.keys(), ...ours.keys(), ...theirs.keys()])
  for (const id of ids) {
    const original = before.get(id)
    const draft = ours.get(id)
    const current = theirs.get(id)
    if (!draft && !current) continue
    if (!draft || !current || (knownBase && !original)) {
      const selected = choose(
        'page:' + id,
        `页面 ${draft?.page.title || current?.page.title || id}（新增、删除或移动）`,
        original,
        draft,
        current
      )
      if (selected) combined.set(id, structuredClone(selected))
      continue
    }
    const page: Record<string, unknown> = Object.create(null)
    for (const field of new Set([
      ...Object.keys(original?.page || {}),
      ...Object.keys(draft.page),
      ...Object.keys(current.page),
    ])) {
      const label =
        [...source.schema.fields, ...(source.schema.types[draft.page.type]?.fields || [])].find(
          (item) => item.key === field
        )?.label || field
      const value = choose(
        `page:${id}:${field}`,
        `${draft.page.title} · ${label}`,
        original?.page[field],
        draft.page[field],
        current.page[field]
      )
      if (value !== undefined) page[field] = structuredClone(value)
    }
    const file = choose(`page:${id}:$file`, `${draft.page.title} · 所属章节`, original?.file, draft.file, current.file)!
    combined.set(id, { file, page: page as EditorPage })
  }
  const documents = source.documents.map((document) => {
    const wanted = new Set([...combined].filter(([, entry]) => entry.file === document.file).map(([id]) => id))
    function order(content: EditorBase) {
      return content.documents
        .find((item) => item.file === document.file)!
        .pages.map((page) => page.id)
        .filter((id) => wanted.has(id))
    }
    const original = order(base)
    const draft = order(local)
    const current = order(source)
    const selected = [...choose('order:' + document.file, document.file + ' · 页面顺序', original, draft, current)]
    // Preserve additions from either side even when a user selects the other side's order.
    for (const reference of [draft, current, [...wanted]])
      for (let i = 0; i < reference.length; i++) {
        const id = reference[i]
        if (selected.includes(id)) continue
        const previous = reference
          .slice(0, i)
          .reverse()
          .find((key) => selected.includes(key))
        const next = reference.slice(i + 1).find((key) => selected.includes(key))
        const index = previous ? selected.indexOf(previous) + 1 : next ? selected.indexOf(next) : selected.length
        selected.splice(index, 0, id)
      }
    return { file: document.file, pages: selected.map((id) => combined.get(id)!.page) }
  })
  const assets: Record<string, string> = Object.create(null)
  for (const key of new Set([
    ...Object.keys(base.assets),
    ...Object.keys(local.assets),
    ...Object.keys(source.assets),
  ])) {
    const value = choose('asset:' + key, '图片映射 · ' + key, base.assets[key], local.assets[key], source.assets[key])
    if (value !== undefined) assets[key] = value
  }
  const uploads = { ...local.uploads }
  const manifestFolder = (source.assetsManifest || '').replaceAll('\\', '/').split('/').slice(0, -1)
  for (const asset of Object.values(source.assets)) {
    const parts = [...manifestFolder]
    for (const part of asset.replaceAll('\\', '/').split('/')) {
      if (part === '..') parts.pop()
      else if (part !== '.') parts.push(part)
    }
    delete uploads[parts.join('/')]
  }
  const draft: EditorDraft = { revision: source.revision, documents, assets, uploads, base: sourceBase(source) }
  return { draft, conflicts, legacy: !knownBase }
}
