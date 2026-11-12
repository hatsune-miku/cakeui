import { type EditorChoices, type EditorConflict, mergeDraft, sameValue, sourceBase } from './merge.js'
import { editorTree } from './tree.js'
import type { EditorBase, EditorDraft, EditorDraftRecord, EditorField, EditorPage, EditorState } from './types.js'

const root = document.getElementById('editor')!
const token = document.querySelector<HTMLMetaElement>('meta[name="cake-editor-token"]')!.content
let data: EditorState
let base: EditorBase
let selected = ''
let dirty = false
let busy = false
let external = false
let version = 0
let previewBusy = false
let previewUrl = ''
let previewTimer: ReturnType<typeof setTimeout>
let lastEdit = ''
let lastEditTime = 0
let dragging = ''
const past: EditorDraft[] = []
const future: EditorDraft[] = []
let stored: EditorDraft | null = null
let storedKey = ''
let sourceRevision = ''
let messageKind = ''
const checkpointId = crypto.randomUUID()
let checkpointSequence = 0
let checkpointVersion = -1
let checkpointTimer: ReturnType<typeof setTimeout>
let checkpointQueue: Promise<unknown> = Promise.resolve()
let archivedStoredId = ''
let recoveryRecords: Pick<EditorDraftRecord, 'sessionId' | 'updatedAt'>[] = []
let syncing = false

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const element = document.createElement(tag)
  element.className = className
  if (text !== undefined) element.textContent = text
  return element
}
function button(text: string, action: () => void, className = 'editor-button') {
  const element = node('button', className, text)
  element.type = 'button'
  element.addEventListener('click', action)
  return element
}
const header = node('header', 'editor-header')
const brand = node('div', 'editor-brand')
brand.append(
  node('strong', 'editor-brand-name', 'Presentation Toolkit'),
  node('span', 'editor-brand-detail', '结构化编辑器')
)
const title = node('div', 'editor-document-title', '正在读取工程…')
const toolbar = node('div', 'editor-toolbar')
const undoButton = button('撤销', undo)
const redoButton = button('重做', redo)
const saveButton = button('保存', () => void persist(false), 'editor-button editor-button-primary')
const exportButton = button('导出 HTML', () => void persist(true))
for (const control of [undoButton, redoButton, saveButton, exportButton]) control.disabled = true
toolbar.append(undoButton, redoButton, saveButton, exportButton)
header.append(brand, title, toolbar)
const message = node('div', 'editor-message')
message.setAttribute('role', 'status')
const workspace = node('main', 'editor-workspace')
const sidebar = node('aside', 'editor-sidebar')
sidebar.setAttribute('aria-label', '页面列表')
const listHeader = node('div', 'editor-panel-header')
const countLabel = node('strong', 'editor-panel-title', '页面')
listHeader.append(countLabel)
const search = node('input', 'editor-search')
search.type = 'search'
search.placeholder = '查找页面'
search.setAttribute('aria-label', '查找页面')
search.addEventListener('input', renderList)
const list = node('div', 'editor-page-list')
const listActions = node('div', 'editor-list-actions')
listActions.append(button('复制页面', duplicate), button('删除页面', removePage))
sidebar.append(listHeader, search, list, listActions)
const center = node('section', 'editor-center')
center.setAttribute('aria-label', '幻灯片预览')
const previewHeader = node('div', 'editor-preview-header')
const previewStatus = node('span', 'editor-preview-status', '准备预览')
const zoom = node('select', 'editor-zoom')
zoom.setAttribute('aria-label', '预览缩放')
for (const [value, label] of [
  ['fit', '适合窗口'],
  ['0.75', '75%'],
  ['1', '100%'],
]) {
  const option = node('option', 'editor-option', label)
  option.value = value
  zoom.append(option)
}
zoom.addEventListener('change', fitPreview)
previewHeader.append(previewStatus, zoom)
const canvas = node('div', 'editor-preview-canvas')
const frameHolder = node('div', 'editor-frame-holder')
const frame = node('iframe', 'editor-preview-frame')
frame.title = '实际幻灯片预览'
frame.width = '1440'
frame.height = '900'
frameHolder.append(frame)
canvas.append(frameHolder)
const previewHint = node('div', 'editor-preview-hint', '修改后自动预览 · Ctrl / ⌘ + S 保存 · Ctrl / ⌘ + Z 撤销')
center.append(previewHeader, canvas, previewHint)
const inspector = node('aside', 'editor-inspector')
inspector.setAttribute('aria-label', '页面内容与布局')
workspace.append(sidebar, inspector, center)
const footer = node('footer', 'editor-footer')
const status = node('span', 'editor-save-status', '正在读取')
const footerActions = node('div', 'editor-footer-actions')
const recoverButton = button('恢复本地草稿', recover)
recoverButton.hidden = true
const sourceButton = button('保留草稿，使用源文件', () => void useSource())
sourceButton.hidden = true
const mergeButton = button('合并外部修改', () => void syncSource(true))
mergeButton.hidden = true
const draftsButton = button('工程草稿', () => void chooseRecovery())
draftsButton.hidden = true
footerActions.append(
  recoverButton,
  sourceButton,
  mergeButton,
  draftsButton,
  button('下载草稿', downloadDraft),
  button('同步源文件', () => void syncSource(true))
)
footer.append(status, footerActions)
root.append(header, message, workspace, footer)

async function api<T>(path: string, draft?: unknown): Promise<T> {
  const response = await fetch('/api/' + path, {
    method: draft ? 'POST' : 'GET',
    headers: { 'X-Cake-Editor-Token': token, ...(draft ? { 'Content-Type': 'application/json' } : {}) },
    ...(draft ? { body: JSON.stringify(draft) } : {}),
  })
  const result = await response.json()
  if (!response.ok)
    throw Object.assign(new Error(result.error || `请求失败：${response.status}`), { status: response.status })
  return result as T
}
function current() {
  return data?.documents.flatMap((document) => document.pages).find((page) => page.id === selected)
}
function snapshot(): EditorDraft {
  return structuredClone({
    revision: data.revision,
    documents: data.documents,
    assets: data.assets,
    uploads: data.uploads,
    base,
  })
}
function storageKey() {
  return 'cake-presentation-draft:' + data.projectId
}
function storeDraft() {
  let retained = true
  try {
    if (dirty) localStorage.setItem(storageKey(), JSON.stringify(snapshot()))
    else localStorage.removeItem(storageKey())
  } catch {
    retained = false
    status.textContent = '草稿未保存 · 浏览器存储空间不足，请保存或下载草稿'
  }
  clearTimeout(checkpointTimer)
  if (dirty)
    checkpointTimer = setTimeout(
      () =>
        void checkpointNow().catch(() => {
          status.textContent = '有未保存的修改 · 工程草稿备份失败，请保存或下载草稿'
        }),
      800
    )
  return retained
}
function checkpointRequest(draft?: EditorDraft, id: string = checkpointId, resolved = false) {
  const sequence = ++checkpointSequence
  const pending = checkpointQueue
    .catch(() => undefined)
    .then(() => api('drafts', { sessionId: id, sequence, draft, resolved }))
  checkpointQueue = pending
  return pending
}
async function checkpointNow() {
  clearTimeout(checkpointTimer)
  if (!dirty) return
  const requested = version
  await checkpointRequest(snapshot())
  if (requested === version) {
    checkpointVersion = version
    controls()
  }
}
async function archiveStored() {
  if (!stored) return
  archivedStoredId ||= 'recovered-' + crypto.randomUUID()
  await checkpointRequest(stored, archivedStoredId)
}
async function listRecoveries() {
  try {
    recoveryRecords = (await api<Pick<EditorDraftRecord, 'sessionId' | 'updatedAt'>[]>('drafts')).filter(
      (record) => record.sessionId !== checkpointId
    )
    draftsButton.hidden = !recoveryRecords.length
    draftsButton.textContent = `工程草稿（${recoveryRecords.length}）`
  } catch {
    /* Local browser recovery remains available if the server is temporarily offline. */
  }
}
function setMessage(text = '', error = false, kind = '') {
  messageKind = kind
  message.textContent = text
  message.classList.toggle('editor-message-error', error)
  message.hidden = !text
}
function controls() {
  undoButton.disabled = busy || !!stored || past.length === 0
  redoButton.disabled = busy || !!stored || future.length === 0
  saveButton.disabled = busy || !!stored || !dirty
  exportButton.disabled = busy || !!stored
  saveButton.textContent = busy ? '处理中…' : '保存'
  status.textContent = busy
    ? '正在处理，请稍候'
    : stored
      ? '有待恢复的草稿'
      : dirty
        ? '有未保存的修改' + (checkpointVersion === version ? ' · 已备份到工程' : '')
        : '已与源文件同步'
  root.classList.toggle('editor-busy', busy)
  workspace.inert = busy
  inspector.inert = busy || !!stored
  recoverButton.hidden = !stored
  sourceButton.hidden = !stored
  mergeButton.hidden = !external
}
function change(action: () => void, key = '', full = false) {
  if (busy || stored) return
  const now = Date.now()
  if (!key || key !== lastEdit || now - lastEditTime > 800) {
    past.push(snapshot())
    if (past.length > 40) past.shift()
  }
  lastEdit = key
  lastEditTime = now
  future.length = 0
  action()
  dirty = true
  version++
  controls()
  renderList()
  storeDraft()
  if (full) renderInspector()
  schedulePreview()
}
function restore(draft: EditorDraft) {
  const revision = data.revision
  Object.assign(data, structuredClone(draft), { revision })
  if (!current()) selected = data.documents.flatMap((document) => document.pages)[0]?.id || ''
  dirty = true
  version++
  lastEdit = ''
  controls()
  renderList()
  renderInspector()
  storeDraft()
  schedulePreview()
}
function undo() {
  if (!busy && !stored && past.length) {
    future.push(snapshot())
    restore(past.pop()!)
  }
}
function redo() {
  if (!busy && !stored && future.length) {
    past.push(snapshot())
    restore(future.pop()!)
  }
}
function select(id: string) {
  selected = id
  lastEdit = ''
  for (const item of list.querySelectorAll<HTMLButtonElement>('.editor-page')) {
    const active = item.dataset.id === selected
    item.classList.toggle('editor-page-selected', active)
    item.setAttribute('aria-current', active ? 'page' : 'false')
  }
  renderInspector()
  showPreview()
}
function findPage(id: string) {
  const document = data.documents.find((item) => item.pages.some((page) => page.id === id))!
  return { document, index: document.pages.findIndex((page) => page.id === id) }
}
function move(id: string, file: string, before?: string) {
  if (data.schema.parentField) return
  const source = findPage(id)
  const target = data.documents.find((document) => document.file === file)!
  if (id === before) return
  change(
    () => {
      const [page] = source.document.pages.splice(source.index, 1)
      if (source.document !== target && data.schema.sectionField && target.pages[0]?.[data.schema.sectionField])
        page[data.schema.sectionField] = target.pages[0][data.schema.sectionField]
      const index = before ? target.pages.findIndex((page) => page.id === before) : target.pages.length
      target.pages.splice(Math.max(0, index), 0, page)
    },
    '',
    true
  )
}
function step(direction: number) {
  if (data.schema.parentField) return
  const { document, index } = findPage(selected)
  if (index + direction < 0 || index + direction >= document.pages.length) return
  change(
    () => {
      const [page] = document.pages.splice(index, 1)
      document.pages.splice(index + direction, 0, page)
    },
    '',
    true
  )
}
function duplicate() {
  if (data.schema.parentField) return
  if (!current()) return
  change(
    () => {
      const { document, index } = findPage(selected)
      const page = structuredClone(document.pages[index])
      page.id = page.id + '-copy-' + crypto.randomUUID().slice(0, 6)
      page.title += '（副本）'
      document.pages.splice(index + 1, 0, page)
      selected = page.id
    },
    '',
    true
  )
}
function removePage() {
  if (!data) return
  if (data.schema.parentField) return
  if (data.documents.flatMap((document) => document.pages).length <= 1) return
  change(
    () => {
      const { document, index } = findPage(selected)
      document.pages.splice(index, 1)
      selected = (
        document.pages[Math.min(index, document.pages.length - 1)] || data.documents.flatMap((item) => item.pages)[0]
      ).id
    },
    '',
    true
  )
}
function renderTreeList() {
  const tree = editorTree(data.documents, data.schema.parentField!)
  const top = list.scrollTop
  const left = list.scrollLeft
  const focused = document.activeElement
  const focusedId = focused instanceof HTMLElement && list.contains(focused) ? focused.dataset.id : undefined
  const query = search.value.toLowerCase()
  const visible = new Set<string>()
  for (const item of tree.order)
    if (item.page.title.toLowerCase().includes(query)) {
      visible.add(item.page.id)
      for (const ancestor of item.ancestors) visible.add(ancestor.page.id)
    }
  countLabel.textContent = `页面 · ${tree.roots.length}（${tree.order.length} 个节点）`
  const fragment = document.createDocumentFragment()
  for (const document of data.documents) {
    const group = node('div', 'editor-page-group')
    const label = data.schema.sectionField && document.pages[0]?.[data.schema.sectionField]
    group.append(node('h2', 'editor-group-title', typeof label === 'string' ? label : document.file.split('/').pop()))
    for (const entry of tree.order) {
      if ((entry.ancestors[0] || entry).file !== document.file || !visible.has(entry.page.id)) continue
      const item = button(
        '',
        () => select(entry.page.id),
        'editor-page editor-tree-page' + (selected === entry.page.id ? ' editor-page-selected' : '')
      )
      item.dataset.id = entry.page.id
      item.dataset.depth = String(entry.ancestors.length)
      item.style.setProperty('--editor-depth', String(entry.ancestors.length))
      item.setAttribute('aria-current', selected === entry.page.id ? 'page' : 'false')
      item.title = [...entry.ancestors, entry].map((part) => part.page.title.replaceAll('\n', '')).join(' › ')
      item.append(
        node('span', 'editor-page-number', entry.number),
        node('span', 'editor-page-title', entry.page.title),
        node(
          'span',
          'editor-page-kind',
          (data.schema.types[entry.page.type]?.label || entry.page.type) +
            (entry.children.length ? ` · ${entry.children.length} 个子节点` : '')
        )
      )
      group.append(item)
    }
    if (group.children.length > 1) fragment.append(group)
  }
  list.replaceChildren(fragment)
  list.scrollTop = top
  list.scrollLeft = left
  if (focusedId)
    [...list.querySelectorAll<HTMLButtonElement>('.editor-page')]
      .find((item) => item.dataset.id === focusedId)
      ?.focus({ preventScroll: true })
}
function renderList() {
  if (!data) return
  listActions.hidden = !!data.schema.parentField
  if (data.schema.parentField) {
    renderTreeList()
    return
  }
  const scrollTop = list.scrollTop
  const scrollLeft = list.scrollLeft
  const focused = document.activeElement
  const focusedId = focused instanceof HTMLElement && list.contains(focused) ? focused.dataset.id : undefined
  const fragment = document.createDocumentFragment()
  const total = data.documents.reduce((sum, document) => sum + document.pages.length, 0)
  countLabel.textContent = `页面 · ${total}`
  let number = 0
  for (const document of data.documents) {
    const group = node('div', 'editor-page-group')
    const label = data.schema.sectionField && document.pages[0]?.[data.schema.sectionField]
    group.append(node('h2', 'editor-group-title', typeof label === 'string' ? label : document.file.split('/').pop()))
    group.addEventListener('dragover', (event) => {
      event.preventDefault()
      group.classList.add('editor-drop-target')
    })
    group.addEventListener('dragleave', () => group.classList.remove('editor-drop-target'))
    group.addEventListener('drop', (event) => {
      event.preventDefault()
      group.classList.remove('editor-drop-target')
      if (dragging) move(dragging, document.file)
    })
    for (const page of document.pages) {
      number++
      if (!page.title.toLowerCase().includes(search.value.toLowerCase())) continue
      const item = button(
        '',
        () => select(page.id),
        'editor-page' + (selected === page.id ? ' editor-page-selected' : '')
      )
      item.setAttribute('aria-current', selected === page.id ? 'page' : 'false')
      item.dataset.id = page.id
      item.draggable = true
      item.append(
        node('span', 'editor-page-number', String(number).padStart(2, '0')),
        node('span', 'editor-page-title', page.title),
        node('span', 'editor-page-kind', data.schema.types[page.type]?.label || page.type)
      )
      item.addEventListener('dragstart', (event) => {
        dragging = page.id
        event.dataTransfer?.setData('text/plain', page.id)
      })
      item.addEventListener('dragend', () => {
        dragging = ''
        list.querySelectorAll('.editor-drop-target').forEach((item) => item.classList.remove('editor-drop-target'))
      })
      item.addEventListener('dragover', (event) => {
        event.preventDefault()
        event.stopPropagation()
        item.classList.add('editor-drop-target')
      })
      item.addEventListener('dragleave', () => item.classList.remove('editor-drop-target'))
      item.addEventListener('drop', (event) => {
        event.preventDefault()
        event.stopPropagation()
        if (dragging) move(dragging, document.file, page.id)
      })
      group.append(item)
    }
    if (group.children.length > 1 || !search.value) fragment.append(group)
  }
  list.replaceChildren(fragment)
  list.scrollTop = scrollTop
  list.scrollLeft = scrollLeft
  if (focusedId)
    [...list.querySelectorAll<HTMLButtonElement>('.editor-page')]
      .find((item) => item.dataset.id === focusedId)
      ?.focus({ preventScroll: true })
}
function options(selectNode: HTMLSelectElement, values: { value: string; label: string }[], value: string) {
  for (const item of values) {
    const option = node('option', 'editor-option', item.label)
    option.value = item.value
    selectNode.append(option)
  }
  selectNode.value = value
}
function textInput(value: string, label: string, multiline: boolean, onInput: (value: string) => void) {
  const input = multiline ? node('textarea', 'editor-input editor-textarea') : node('input', 'editor-input')
  input.value = value
  input.setAttribute('aria-label', label)
  if (input instanceof HTMLTextAreaElement) input.rows = 3
  input.addEventListener('input', () => onInput(input.value))
  return input
}
function renderField(page: EditorPage, field: EditorField) {
  const wrapper = node('div', 'editor-field')
  const label = node('label', 'editor-field-label', field.label)
  const controlId = 'field-' + field.key
  label.htmlFor = controlId
  wrapper.append(label)
  const value = page[field.key]
  function update(value: unknown, full = false) {
    change(
      () => {
        page[field.key] = value
      },
      selected + ':' + field.key,
      full
    )
  }
  let control: HTMLElement
  if (field.type === 'boolean') {
    const input = node('input', 'editor-checkbox')
    input.type = 'checkbox'
    input.checked = !!value
    input.addEventListener('change', () => update(input.checked))
    control = input
  } else if (field.type === 'select' || field.type === 'image') {
    const input = node('select', 'editor-input')
    const values =
      field.type === 'image'
        ? Object.keys(data.assets).map((key) => ({
            value: key,
            label: field.options?.find((option) => option.value === key)?.label || key,
          }))
        : field.options || []
    options(
      input,
      field.required ? values : [{ value: '', label: '默认' }, ...values.filter((item) => item.value !== '')],
      String(value ?? '')
    )
    input.addEventListener('change', () => update(input.value))
    control = input
    if (field.type === 'image' && data.assetsDirectory) {
      const upload = node('input', 'editor-upload')
      upload.type = 'file'
      upload.accept = 'image/png,image/jpeg,image/webp,image/gif,image/avif'
      upload.hidden = true
      upload.addEventListener('change', () => {
        const file = upload.files?.[0]
        if (file) void uploadImage(file, field.key)
      })
      wrapper.append(
        upload,
        button('上传新图片', () => upload.click(), 'editor-button editor-upload-button')
      )
    }
  } else if (field.type === 'list' || field.type === 'table') {
    const rows = Array.isArray(value) ? value : []
    const array = node('div', 'editor-array')
    rows.forEach((row, i) => {
      const entry = node('div', 'editor-array-entry')
      const cells = field.type === 'table' ? (row as string[]) : [row as string]
      const content = node('div', 'editor-array-content')
      cells.forEach((cell, j) => {
        const cellLabel = `${field.label} ${i + 1}${field.columns ? ' · ' + field.columns[j] : ''}`
        if (field.columns) content.append(node('span', 'editor-cell-label', field.columns[j]))
        function updateCell(text: string) {
          change(() => {
            if (field.type === 'table') (page[field.key] as string[][])[i][j] = text
            else (page[field.key] as string[])[i] = text
          }, `${selected}:${field.key}:${i}:${j}`)
        }
        if (field.options) {
          const input = node('select', 'editor-input')
          options(input, field.options, String(cell))
          input.setAttribute('aria-label', cellLabel)
          input.addEventListener('change', () => updateCell(input.value))
          content.append(input)
        } else
          content.append(
            textInput(String(cell), cellLabel, field.type === 'table' || String(cell).length > 55, updateCell)
          )
      })
      const actions = node('div', 'editor-array-actions')
      const up = button('↑', () => {
        const next = structuredClone(rows)
        ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
        update(next, true)
      })
      up.disabled = i === 0
      up.setAttribute('aria-label', `上移${field.label}第 ${i + 1} 项`)
      const down = button('↓', () => {
        const next = structuredClone(rows)
        ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
        update(next, true)
      })
      down.disabled = i === rows.length - 1
      down.setAttribute('aria-label', `下移${field.label}第 ${i + 1} 项`)
      const remove = button('移除', () =>
        update(
          rows.filter((_, index) => index !== i),
          true
        )
      )
      remove.setAttribute('aria-label', `移除${field.label}第 ${i + 1} 项`)
      actions.append(up, down, remove)
      entry.append(content, actions)
      array.append(entry)
    })
    array.append(
      button('添加一项', () =>
        update([...rows, field.type === 'table' ? field.columns!.map(() => '') : field.options?.[0]?.value || ''], true)
      )
    )
    control = array
  } else control = textInput(String(value ?? ''), field.label, field.type === 'textarea', (value) => update(value))
  control.id = controlId
  if (!(control instanceof HTMLInputElement) || control.type !== 'checkbox')
    control.setAttribute('aria-label', field.label)
  wrapper.append(control)
  if (field.help) wrapper.append(node('p', 'editor-field-help', field.help))
  return wrapper
}
function renderInspector() {
  inspector.replaceChildren()
  const page = current()
  if (!page) return
  const head = node('div', 'editor-panel-header')
  head.append(
    node('strong', 'editor-panel-title', '内容与布局'),
    node('span', 'editor-layout-name', data.schema.types[page.type]?.label || page.type)
  )
  const position = node('div', 'editor-position')
  const up = button('上移页面', () => step(-1))
  const down = button('下移页面', () => step(1))
  const location = findPage(selected)
  up.disabled = location.index === 0
  down.disabled = location.index === location.document.pages.length - 1
  position.append(up, down)
  const file = node('select', 'editor-input')
  file.setAttribute('aria-label', '所属章节文件')
  options(
    file,
    data.documents.map((document) => ({ value: document.file, label: document.file.split('/').pop()! })),
    location.document.file
  )
  file.addEventListener('change', () => move(selected, file.value))
  position.append(file)
  const fields = node('div', 'editor-fields')
  for (const field of [...data.schema.fields, ...(data.schema.types[page.type]?.fields || [])])
    fields.append(renderField(page, field))
  inspector.append(head, position, fields)
  if (data.schema.parentField) {
    const entry = editorTree(data.documents, data.schema.parentField).byId.get(page.id)!
    const path = node('div', 'editor-tree-path')
    path.append(node('span', 'editor-tree-path-label', '节点路径 · 结构只读'))
    for (const part of [...entry.ancestors, entry]) {
      const link = button(`${part.number} ${part.page.title.replaceAll('\n', '')}`, () => select(part.page.id))
      link.disabled = part === entry
      path.append(link)
    }
    position.replaceWith(path)
  }
}
async function uploadImage(file: File, key: string) {
  try {
    if (file.size > 9 * 1024 * 1024) throw new Error('单张图片不能超过 9 MB。')
    const extensions: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/avif': '.avif',
    }
    const extension = extensions[file.type]
    if (!extension) throw new Error('请选择 PNG、JPEG、WebP、GIF 或 AVIF 图片。')
    const bitmap = await createImageBitmap(file)
    bitmap.close()
    const originalPage = selected
    const encoded = await new Promise<string>((done, fail) => {
      const reader = new FileReader()
      reader.onload = () => done(String(reader.result).split(',')[1])
      reader.onerror = () => fail(reader.error)
      reader.readAsDataURL(file)
    })
    if (selected !== originalPage) throw new Error('页面已切换，请在需要配图的页面重新上传。')
    const id = 'image-' + crypto.randomUUID().slice(0, 8)
    const path = data.assetsDirectory!.replace(/\/$/, '') + '/' + id + extension
    const manifestParts = data.assetsManifest!.replace(/\\/g, '/').split('/').slice(0, -1)
    const imageParts = path.replace(/\\/g, '/').split('/')
    while (manifestParts.length && imageParts.length && manifestParts[0] === imageParts[0]) {
      manifestParts.shift()
      imageParts.shift()
    }
    const relative = [...manifestParts.map(() => '..'), ...imageParts].join('/')
    change(
      () => {
        data.uploads[path] = encoded
        data.assets[id] = relative
        current()![key] = id
      },
      '',
      true
    )
    setMessage('图片已加入草稿，保存时写入素材目录。')
  } catch (error) {
    setMessage(String((error as Error).message), true)
  }
}
function fitPreview() {
  const scale =
    zoom.value === 'fit'
      ? Math.max(0.1, Math.min((canvas.clientWidth - 40) / 1440, (canvas.clientHeight - 40) / 900))
      : Number(zoom.value)
  frame.style.transform = `scale(${scale})`
  frameHolder.style.width = 1440 * scale + 'px'
  frameHolder.style.height = 900 * scale + 'px'
}
function showPreview() {
  if (previewUrl) frame.src = previewUrl + '&page=' + encodeURIComponent(selected) + '#' + encodeURIComponent(selected)
}
function schedulePreview() {
  clearTimeout(previewTimer)
  previewStatus.textContent = '正在更新预览…'
  previewTimer = setTimeout(() => void preview(), 350)
}
async function preview() {
  if (previewBusy || !data) return
  previewBusy = true
  const requested = version
  try {
    const result = await api<{ url: string; sourceRevision: string }>('preview', snapshot())
    if (requested === version) {
      previewUrl = result.url
      sourceRevision = result.sourceRevision
      showPreview()
      previewStatus.textContent = dirty ? '草稿预览' : '已保存版本'
      if (messageKind === 'preview') setMessage()
    }
  } catch (error) {
    if (requested === version) {
      previewStatus.textContent = '预览未更新'
      setMessage((error as Error).message, true, 'preview')
    }
  } finally {
    previewBusy = false
    if (requested !== version) schedulePreview()
  }
}
async function persist(exportHtml: boolean) {
  if (busy || stored) return
  busy = true
  controls()
  setMessage()
  try {
    const latest = await api<EditorState>('state')
    if (latest.revision !== data.revision && !(await reconcile(snapshot(), latest, true))) return
    await checkpointNow()
    const result = await api<{ state: EditorState; backup: string | null; outfile?: string }>(
      exportHtml ? 'export' : 'save',
      snapshot()
    )
    const savedUploads = Object.keys(data.uploads)
    data = result.state
    base = sourceBase(data)
    dirty = false
    external = false
    version++
    for (const draft of [...past, ...future]) {
      draft.assets = { ...data.assets, ...draft.assets }
      for (const path of savedUploads) delete draft.uploads[path]
    }
    stored = null
    recoverButton.hidden = true
    storeDraft()
    // Keep a completed recovery record; delayed older requests cannot reopen it.
    await checkpointRequest(undefined, checkpointId, true)
    if (archivedStoredId) await checkpointRequest(undefined, archivedStoredId, true)
    setMessage(
      result.outfile ? `已导出：${result.outfile}` : '已保存到源文件。' + (result.backup ? '修改前版本已备份。' : '')
    )
    renderList()
    renderInspector()
    schedulePreview()
  } catch (error) {
    if ((error as { status?: number }).status === 409) external = true
    setMessage((error as Error).message, true)
  } finally {
    busy = false
    controls()
  }
}
function downloadDraft() {
  if (!data) return
  download(stored || snapshot(), 'presentation-draft.json')
}
function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }))
  const link = node('a', 'editor-download')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function describe(value: unknown) {
  if (value === undefined) return '（已删除）'
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return text.length > 4000 ? text.slice(0, 4000) + '\n…（完整内容可下载）' : text
}
function conflictChoices(conflicts: EditorConflict[], local: EditorDraft, latest: EditorState) {
  return new Promise<EditorChoices | null>((resolve) => {
    const dialog = node('dialog', 'editor-conflicts')
    const heading = node('h2', 'editor-conflicts-title', '选择要保留的修改')
    heading.id = 'editor-conflicts-title'
    dialog.setAttribute('aria-labelledby', heading.id)
    dialog.append(
      heading,
      node('p', 'editor-conflicts-hint', '以下内容在两边都有修改。每项选择一个版本；未列出的修改会一起保留。')
    )
    const body = node('div', 'editor-conflicts-body')
    const choices: EditorChoices = Object.create(null)
    const apply = button('合并到草稿', () => finish(choices), 'editor-button editor-button-primary')
    apply.disabled = true
    for (const conflict of conflicts) {
      const entry = node('section', 'editor-conflict')
      entry.append(node('h3', 'editor-conflict-title', conflict.label))
      const alternatives = node('div', 'editor-conflict-alternatives')
      for (const [name, value] of [
        ['编辑器草稿', conflict.draft],
        ['当前源文件', conflict.source],
      ] as const) {
        const column = node('div', 'editor-conflict-version')
        column.append(
          node('strong', 'editor-conflict-version-label', name),
          node('pre', 'editor-conflict-value', describe(value))
        )
        alternatives.append(column)
      }
      const choice = node('select', 'editor-input')
      choice.setAttribute('aria-label', '保留版本：' + conflict.label)
      options(
        choice,
        [
          { value: '', label: '请选择保留的版本' },
          { value: 'draft', label: '保留编辑器草稿' },
          { value: 'source', label: '保留当前源文件' },
        ],
        ''
      )
      choice.addEventListener('change', () => {
        if (choice.value) choices[conflict.key] = choice.value as 'draft' | 'source'
        else delete choices[conflict.key]
        apply.disabled = conflicts.some((item) => !choices[item.key])
      })
      entry.append(alternatives, choice)
      body.append(entry)
    }
    const actions = node('div', 'editor-conflicts-actions')
    actions.append(
      button('下载两版', () => download({ draft: local, source: latest }, 'presentation-conflicts.json')),
      button('暂不合并', () => finish(null)),
      apply
    )
    dialog.append(body, actions)
    function finish(value: EditorChoices | null) {
      dialog.close()
      dialog.remove()
      resolve(value)
    }
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault()
      finish(null)
    })
    root.append(dialog)
    dialog.showModal()
  })
}
function applyMerged(draft: EditorDraft, latest: EditorState) {
  const focused = document.activeElement
  const focus =
    focused instanceof HTMLInputElement ||
    focused instanceof HTMLTextAreaElement ||
    focused instanceof HTMLSelectElement
      ? {
          label: focused.getAttribute('aria-label'),
          id: focused.id,
          start: 'selectionStart' in focused ? focused.selectionStart : null,
          end: 'selectionEnd' in focused ? focused.selectionEnd : null,
          direction: 'selectionDirection' in focused ? focused.selectionDirection : null,
        }
      : null
  const scrollTop = inspector.scrollTop
  data = { ...latest, ...draft }
  base = sourceBase(latest)
  if (!current()) selected = data.documents.flatMap((document) => document.pages)[0]?.id || ''
  dirty =
    !sameValue(data.documents, latest.documents) ||
    !sameValue(data.assets, latest.assets) ||
    !!Object.keys(data.uploads).length
  external = false
  stored = null
  version++
  past.length = 0
  future.length = 0
  lastEdit = ''
  controls()
  renderList()
  renderInspector()
  inspector.scrollTop = scrollTop
  if (focus) {
    const control = [
      ...inspector.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input,textarea,select'
      ),
    ].find((item) => (focus.label ? item.getAttribute('aria-label') === focus.label : item.id === focus.id))
    control?.focus({ preventScroll: true })
    if (control && 'setSelectionRange' in control && focus.start !== null && focus.end !== null)
      control.setSelectionRange(focus.start, focus.end, focus.direction || undefined)
  }
  const retained = storeDraft()
  if (retained && storedKey && storedKey !== storageKey()) {
    try {
      localStorage.removeItem(storedKey)
    } catch {
      /* The new project-specific draft is already retained. */
    }
  }
  storedKey = ''
  schedulePreview()
}
async function reconcile(local: EditorDraft, latest: EditorState, interactive: boolean) {
  let result = mergeDraft(local, latest)
  if (result.conflicts.length) {
    external = true
    controls()
    if (!interactive) {
      setMessage(`两边有 ${result.conflicts.length} 处修改需要选择；草稿已保留，点击“合并外部修改”处理。`, true)
      return false
    }
    const choices = await conflictChoices(result.conflicts, local, latest)
    if (!choices) return false
    result = mergeDraft(local, latest, choices)
  }
  applyMerged(result.draft, latest)
  return true
}
async function recover() {
  if (!stored || busy) return
  busy = true
  controls()
  try {
    await archiveStored()
    if (await reconcile(stored, await api<EditorState>('state'), true))
      setMessage('已将草稿与当前源文件合并。请检查预览后保存。')
  } catch (error) {
    setMessage((error as Error).message, true)
  } finally {
    busy = false
    controls()
  }
}
async function useSource() {
  if (!stored || busy) return
  busy = true
  controls()
  try {
    await archiveStored()
    const latest = await api<EditorState>('state')
    applyMerged({ ...sourceBase(latest), base: sourceBase(latest), uploads: {} }, latest)
    setMessage('已使用当前源文件，原草稿保留在“工程草稿”中。')
    await listRecoveries()
  } catch (error) {
    setMessage((error as Error).message, true)
  } finally {
    busy = false
    controls()
  }
}
async function chooseRecovery() {
  if (busy) return
  if (dirty || stored) {
    setMessage('请先保存或处理当前草稿，再载入其他工程草稿；不会替换当前编辑。', true)
    return
  }
  await listRecoveries()
  if (dirty || stored || busy) {
    setMessage('当前编辑已变化，请先保存或处理草稿，再载入其他工程草稿。', true)
    return
  }
  const dialog = node('dialog', 'editor-conflicts')
  const heading = node('h2', 'editor-conflicts-title', '工程草稿')
  dialog.setAttribute('aria-label', '工程草稿')
  const body = node('div', 'editor-conflicts-body')
  for (const record of recoveryRecords) {
    const item = button(
      new Date(record.updatedAt).toLocaleString('zh-CN') + ' · ' + record.sessionId.slice(0, 8),
      () => {
        dialog.close()
        dialog.remove()
        busy = true
        controls()
        void (async () => {
          try {
            stored = (await api<EditorDraftRecord>('drafts/' + record.sessionId)).draft
            archivedStoredId = ''
            busy = false
            controls()
            await recover()
          } catch (error) {
            setMessage((error as Error).message, true)
          } finally {
            busy = false
            controls()
          }
        })()
      },
      'editor-button editor-recovery-item'
    )
    body.append(item)
  }
  dialog.append(
    heading,
    node('p', 'editor-conflicts-hint', '载入时与当前源文件合并，不直接覆盖。'),
    body,
    button('关闭', () => {
      dialog.close()
      dialog.remove()
    })
  )
  dialog.addEventListener('cancel', () => dialog.remove())
  root.append(dialog)
  dialog.showModal()
}
async function syncSource(interactive = false) {
  if (!data || busy || syncing) return
  if (stored) {
    if (interactive) await recover()
    return
  }
  syncing = true
  if (interactive) {
    busy = true
    controls()
  }
  const requested = version
  try {
    const latest = await api<EditorState>('state')
    // Do not replace an input made while the network request was in flight.
    if (requested !== version || (!interactive && busy) || latest.revision === data.revision) return
    if (await reconcile(snapshot(), latest, interactive))
      setMessage('外部修改已合并，编辑器里的修改已保留。合并后重新建立撤销历史。')
  } catch (error) {
    setMessage((error as Error).message, true)
  } finally {
    syncing = false
    if (interactive) busy = false
    controls()
  }
}
async function load() {
  busy = true
  try {
    data = await api<EditorState>('state')
    base = sourceBase(data)
    if (!current()) selected = data.documents.flatMap((document) => document.pages)[0]?.id || ''
    dirty = false
    external = false
    version++
    past.length = 0
    future.length = 0
    title.textContent = data.title
    controls()
    renderList()
    renderInspector()
    setMessage()
    schedulePreview()
    try {
      storedKey = localStorage.getItem(storageKey()) ? storageKey() : 'cake-presentation-draft:' + data.title
      stored = JSON.parse(localStorage.getItem(storedKey) || 'null') as EditorDraft | null
    } catch {
      stored = null
    }
    if (stored) {
      const candidate = stored
      try {
        const result = mergeDraft(candidate, data)
        if (!result.conflicts.length) {
          applyMerged(result.draft, data)
          setMessage('已恢复上次草稿，并保留当前源文件中的其他修改。')
        } else setMessage('发现上次未保存的草稿；请恢复并合并，或保留草稿后使用源文件。', true)
      } catch (error) {
        setMessage((error as Error).message, true)
      }
    }
    await listRecoveries()
  } catch (error) {
    setMessage((error as Error).message, true)
  } finally {
    busy = false
    controls()
  }
}
document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey)) return
  const key = event.key.toLowerCase()
  if (key === 's') {
    event.preventDefault()
    void persist(false)
  }
  if (key === 'z') {
    event.preventDefault()
    event.shiftKey ? redo() : undo()
  }
  if (key === 'y') {
    event.preventDefault()
    redo()
  }
})
window.addEventListener('beforeunload', (event) => {
  if (dirty) {
    event.preventDefault()
    event.returnValue = ''
  }
})
new ResizeObserver(fitPreview).observe(canvas)
setInterval(() => {
  if (!data || busy || document.hidden) return
  void api<{ revision: string; sourceRevision: string }>('revision')
    .then((result) => {
      if (sourceRevision && sourceRevision !== result.sourceRevision) schedulePreview()
      sourceRevision = result.sourceRevision
      if (result.revision === data.revision) return
      if (!external) void syncSource(false)
    })
    .catch(() => {
      status.textContent = '编辑服务暂时无法连接；草稿仍保留在本页'
    })
}, 3000)
void load()
