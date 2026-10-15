import type { EditorDocument, EditorPage } from './types.js'

export interface EditorTreeNode {
  page: EditorPage
  file: string
  parent?: EditorTreeNode
  children: EditorTreeNode[]
  ancestors: EditorTreeNode[]
  number: string
}

export function editorTree(documents: EditorDocument[], parentField: string) {
  const byId = new Map<string, EditorTreeNode>()
  for (const document of documents)
    for (const page of document.pages) {
      if (byId.has(page.id)) throw new Error(`页面 id 重复：${page.id}`)
      byId.set(page.id, { page, file: document.file, children: [], ancestors: [], number: '' })
    }
  const roots: EditorTreeNode[] = []
  for (const item of byId.values()) {
    const id = item.page[parentField]
    if (id === undefined) roots.push(item)
    else {
      if (typeof id !== 'string' || !byId.has(id)) throw new Error(`${item.page.id} 的父节点不存在：${String(id)}`)
      item.parent = byId.get(id)!
      item.parent.children.push(item)
    }
  }
  const complete = new Set<EditorTreeNode>()
  for (const item of byId.values()) {
    const path = new Set<EditorTreeNode>()
    let node: EditorTreeNode | undefined = item
    while (node && !complete.has(node)) {
      if (path.has(node)) throw new Error(`页面父子关系存在循环：${node.page.id}`)
      path.add(node)
      node = node.parent
    }
    for (const member of path) complete.add(member)
  }
  const order: EditorTreeNode[] = []
  function visit(items: EditorTreeNode[], ancestors: EditorTreeNode[], prefix: string) {
    items.forEach((item, i) => {
      item.ancestors = ancestors
      item.number = prefix ? `${prefix}.${i + 1}` : String(i + 1).padStart(2, '0')
      order.push(item)
      visit(item.children, [...ancestors, item], item.number)
    })
  }
  visit(roots, [], '')
  return { roots, order, byId }
}
