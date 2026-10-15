import { type Plugin, build } from 'esbuild'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'

import { mergeDraft, sameValue } from './merge.js'
import { editorPreviewHtml } from './preview.js'
import { editorTree } from './tree.js'
import type { EditorDraft, EditorField, EditorSchema, EditorState } from './types.js'

import { assetPlugin } from '../assets.js'
import { bundleOptions, renderPresentation } from '../bundle.js'
import { buildPresentation, loadConfig } from '../index.js'

class EditorError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message)
  }
}

function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(value))
}

async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 32 * 1024 * 1024) throw new EditorError('草稿超过 32 MB，请减少本次上传的图片。', 413)
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new EditorError('请求不是有效的 JSON。')
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function validateSchema(value: unknown): asserts value is EditorSchema {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.fields) || !object(value.types))
    throw new EditorError('编辑配置需要 version: 1、fields 和 types。')
  if (value.sectionField !== undefined && typeof value.sectionField !== 'string')
    throw new EditorError('sectionField 必须为字符串。')
  if (
    value.parentField !== undefined &&
    (typeof value.parentField !== 'string' ||
      !value.parentField ||
      ['__proto__', 'constructor', 'prototype', 'id', 'type', 'title'].includes(value.parentField))
  )
    throw new EditorError('parentField 必须为有效的父节点字段名。')
  const groups: unknown[][] = [value.fields]
  for (const item of Object.values(value.types)) {
    if (!object(item) || typeof item.label !== 'string' || !Array.isArray(item.fields))
      throw new EditorError('页面类型需要 label 和 fields。')
    groups.push(item.fields)
  }
  for (const fields of groups) {
    const keys = new Set<string>()
    for (const field of fields) {
      if (
        !object(field) ||
        typeof field.key !== 'string' ||
        !field.key ||
        ['__proto__', 'constructor', 'prototype', 'id', 'type'].includes(field.key) ||
        field.key === value.parentField ||
        typeof field.label !== 'string' ||
        !['text', 'textarea', 'boolean', 'select', 'list', 'table', 'image'].includes(String(field.type))
      )
        throw new EditorError('编辑字段配置无效。')
      if (keys.has(field.key)) throw new EditorError(`重复字段：${field.key}`)
      keys.add(field.key)
      if (
        field.type === 'table' &&
        (!Array.isArray(field.columns) || !field.columns.length || field.columns.some((x) => typeof x !== 'string'))
      )
        throw new EditorError(`表格 ${field.key} 缺少列名。`)
      if (
        field.options !== undefined &&
        (!Array.isArray(field.options) ||
          field.options.some((x) => !object(x) || typeof x.value !== 'string' || typeof x.label !== 'string'))
      )
        throw new EditorError(`选项 ${field.key} 无效。`)
    }
  }
}

function validateField(field: EditorField, value: unknown) {
  if (value === undefined || value === null) {
    if (field.required) throw new EditorError(`请填写“${field.label}”。`)
    return
  }
  if (field.type === 'boolean') {
    if (typeof value !== 'boolean') throw new EditorError(`${field.label} 必须为开关值。`)
  } else if (field.type === 'list' || field.type === 'table') {
    if (!Array.isArray(value)) throw new EditorError(`${field.label} 必须为列表。`)
    for (const row of value) {
      const cells = field.type === 'table' ? row : [row]
      if (
        !Array.isArray(cells) ||
        cells.some((cell) => typeof cell !== 'string') ||
        (field.type === 'table' && cells.length !== field.columns!.length)
      )
        throw new EditorError(`${field.label} 的列数或文字格式不正确。`)
      if (field.options && cells.some((cell) => !field.options!.some((option) => option.value === cell)))
        throw new EditorError(`${field.label} 包含未知选项。`)
    }
  } else {
    if (typeof value !== 'string' || (field.required && !value.trim()))
      throw new EditorError(`请填写“${field.label}”。`)
    if (field.type === 'select' && field.options && !field.options.some((option) => option.value === value))
      throw new EditorError(`${field.label} 包含未知选项。`)
  }
}

/** Separate authoring server. The build/dev commands remain usable without a schema. */
export async function startEditor(filename: string, port = 4174) {
  const { config, cwd } = await loadConfig(filename)
  if (!config.editor) throw new EditorError('请在 presentation.config.json 配置 editor.files 与 editor.schema。')
  const settings = config.editor
  const root = await realpath(cwd)
  const projectPath = resolve(root, relative(cwd, resolve(filename))).replaceAll('\\', '/')
  const projectId = createHash('sha256')
    .update(process.platform === 'win32' ? projectPath.toLowerCase() : projectPath)
    .digest('hex')
    .slice(0, 24)
  const token = randomUUID()
  const previews = new Map<string, string>()
  const watchedSources = new Set<string>()
  let mutationQueue = Promise.resolve()

  async function localPath(path: string) {
    const full = resolve(cwd, path)
    const rel = relative(cwd, full)
    if (!rel || rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel))
      throw new EditorError('文件必须位于当前工程内。')
    let ancestor = full
    while (true) {
      try {
        const actual = await realpath(ancestor)
        const actualRelative = relative(root, actual)
        if (actualRelative.startsWith('..' + sep) || actualRelative === '..' || isAbsolute(actualRelative))
          throw new EditorError('文件链接指向工程外部。')
        return full
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        const parent = dirname(ancestor)
        if (parent === ancestor) throw error
        ancestor = parent
      }
    }
  }

  const documentPaths = await Promise.all(settings.files.map(localPath))
  if (
    new Set(documentPaths.map((path) => (process.platform === 'win32' ? path.toLowerCase() : path))).size !==
    documentPaths.length
  )
    throw new EditorError('内容文件不能重复。')
  const schemaPath = await localPath(settings.schema)
  const manifestPath = config.assets ? await localPath(config.assets) : undefined
  if (manifestPath && documentPaths.includes(manifestPath)) throw new EditorError('图片清单不能同时作为内容文件。')
  if (
    documentPaths.some(
      (path) =>
        extname(path).toLowerCase() !== '.json' ||
        path === schemaPath ||
        path === resolve(cwd, config.outfile) ||
        path === resolve(filename)
    )
  )
    throw new EditorError('内容文件必须为独立的 JSON 页面数组。')

  async function state(): Promise<EditorState> {
    const schemaText = await readFile(schemaPath, 'utf8')
    const schema: unknown = JSON.parse(schemaText)
    validateSchema(schema)
    const texts = await Promise.all(documentPaths.map((path) => readFile(path, 'utf8')))
    const assetText = manifestPath ? await readFile(manifestPath, 'utf8') : '{}'
    const assets: unknown = JSON.parse(assetText)
    if (!object(assets) || Object.values(assets).some((path) => typeof path !== 'string'))
      throw new EditorError('图片清单必须为名称到本地路径的映射。')
    const documents = texts.map((text, i) => ({ file: settings.files[i], pages: JSON.parse(text) }))
    if (documents.some((document) => !Array.isArray(document.pages)))
      throw new EditorError('每个内容文件必须包含页面数组。')
    if (schema.parentField) {
      try {
        editorTree(documents, schema.parentField)
      } catch (error) {
        throw new EditorError((error as Error).message)
      }
    }
    const configText = await readFile(resolve(filename), 'utf8')
    const revision = createHash('sha256')
      .update(JSON.stringify([configText, schemaText, texts, assetText]))
      .digest('hex')
    return {
      projectId,
      title: config.title,
      schema,
      revision,
      documents,
      assets: assets as Record<string, string>,
      uploads: {},
      assetsManifest: config.assets,
      assetsDirectory: settings.assetsDirectory,
    }
  }

  async function validateDraft(value: unknown, current: EditorState): Promise<EditorDraft> {
    if (
      !object(value) ||
      typeof value.revision !== 'string' ||
      !Array.isArray(value.documents) ||
      !object(value.assets) ||
      !object(value.uploads)
    )
      throw new EditorError('草稿结构无效。')
    const draft = value as unknown as EditorDraft
    if (
      draft.documents.length !== settings.files.length ||
      draft.documents.some(
        (document, i) => !object(document) || document.file !== settings.files[i] || !Array.isArray(document.pages)
      )
    )
      throw new EditorError('只能编辑已配置的内容文件。')
    const ids = new Set<string>()
    for (const document of draft.documents)
      for (const page of document.pages) {
        if (
          !object(page) ||
          typeof page.id !== 'string' ||
          !/^[\w-]+$/.test(page.id) ||
          typeof page.title !== 'string' ||
          !page.title.trim() ||
          typeof page.type !== 'string' ||
          !Object.hasOwn(current.schema.types, page.type)
        )
          throw new EditorError('页面需要唯一 id、标题和已配置的页面类型。')
        if (ids.has(page.id)) throw new EditorError(`页面 id 重复：${page.id}`)
        ids.add(page.id)
        for (const field of [...current.schema.fields, ...current.schema.types[page.type].fields]) {
          validateField(field, page[field.key])
          if (field.type === 'image' && page[field.key] && !Object.hasOwn(draft.assets, String(page[field.key])))
            throw new EditorError(`${page.title} 的图片不存在。`)
        }
      }
    if (!ids.size) throw new EditorError('至少保留一页。')
    if (current.schema.parentField) {
      try {
        editorTree(draft.documents, current.schema.parentField)
      } catch (error) {
        throw new EditorError((error as Error).message)
      }
    }
    const directory = settings.assetsDirectory ? await localPath(settings.assetsDirectory) : undefined
    const uploadPaths = new Set<string>()
    for (const [path, data] of Object.entries(draft.uploads)) {
      if (
        !directory ||
        typeof data !== 'string' ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(data) ||
        data.length > 12 * 1024 * 1024
      )
        throw new EditorError('图片上传无效或单张超过 9 MB。')
      const full = await localPath(path)
      const rel = relative(directory, full)
      if (!rel || rel.startsWith('..') || isAbsolute(rel) || !/\.(png|jpe?g|webp|gif|avif)$/i.test(full))
        throw new EditorError('上传图片必须位于配置的图片目录。')
      try {
        await readFile(full)
        throw new EditorError('新图片不能覆盖已有文件。')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      uploadPaths.add(full)
    }
    for (const [key, path] of Object.entries(draft.assets)) {
      if (typeof path !== 'string' || !manifestPath || /^(?:\w+:|\/\/)/.test(path))
        throw new EditorError('图片必须来自本地文件。')
      const full = await localPath(relative(cwd, resolve(dirname(manifestPath), path)))
      if (!uploadPaths.has(full) && current.assets[key] !== path) throw new EditorError('新增图片应通过上传操作添加。')
      if (!uploadPaths.has(full)) await readFile(full)
    }
    for (const key of Object.keys(current.assets))
      if (!Object.hasOwn(draft.assets, key)) throw new EditorError('不能删除已有图片映射。')
    return draft
  }

  async function renderDraft(draft: EditorDraft) {
    const overrides = new Map(
      draft.documents.map((document) => [resolve(cwd, document.file), JSON.stringify(document.pages)])
    )
    const uploads = new Map(
      Object.entries(draft.uploads).map(([path, data]) => [resolve(cwd, path), Buffer.from(data, 'base64')])
    )
    const plugin: Plugin = {
      name: 'presentation-editor-draft',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          const full = isAbsolute(args.path) ? args.path : resolve(args.resolveDir || cwd, args.path)
          if (uploads.has(full)) return { path: full, namespace: 'file' }
          return undefined
        })
        builder.onLoad({ filter: /.*/ }, (args) => {
          const jsonText = overrides.get(args.path)
          if (jsonText !== undefined) return { contents: jsonText, loader: 'json' }
          const image = uploads.get(args.path)
          if (image) return { contents: image, loader: 'dataurl' }
          return undefined
        })
      },
    }
    const options = bundleOptions(config, cwd, watchedSources)
    const result = await build({
      ...options,
      plugins: [
        plugin,
        assetPlugin(config, cwd, draft.assets),
        ...(options.plugins ?? []).filter((item) => item.name !== 'presentation-assets'),
      ],
    })
    const rendered = renderPresentation(result, config, cwd)
    for (const input of rendered.inputs) {
      const full = resolve(cwd, input)
      if (!input.startsWith('presentation-assets:') && !input.includes('node_modules') && !documentPaths.includes(full))
        watchedSources.add(full)
    }
    return rendered
  }

  async function sourceRevision() {
    const stamps = await Promise.all(
      [...watchedSources].sort().map(async (path) => {
        try {
          const info = await stat(path)
          return [path, info.mtimeMs, info.size]
        } catch {
          return [path, 'missing']
        }
      })
    )
    return createHash('sha256').update(JSON.stringify(stamps)).digest('hex')
  }

  async function atomic(path: string, content: string | Buffer) {
    await mkdir(dirname(path), { recursive: true })
    const temporary = path + '.' + randomUUID() + '.tmp'
    try {
      await writeFile(temporary, content)
      await rename(temporary, path)
    } finally {
      await rm(temporary, { force: true })
    }
  }

  async function save(draft: EditorDraft) {
    const current = await state()
    if (current.revision !== draft.revision)
      throw new EditorError('源文件已被其他编辑器修改。请保留草稿，重新载入后合并修改。', 409)
    await validateDraft(draft, current)
    await renderDraft(draft)
    const entries = draft.documents.map((document) => ({
      path: resolve(cwd, document.file),
      content: (JSON.stringify(document.pages, null, 2) + '\n') as string | Buffer,
    }))
    if (manifestPath) entries.push({ path: manifestPath, content: JSON.stringify(draft.assets, null, 2) + '\n' })
    for (const [path, data] of Object.entries(draft.uploads))
      entries.push({ path: resolve(cwd, path), content: Buffer.from(data, 'base64') })
    const changed: typeof entries = []
    const originals = new Map<string, Buffer | null>()
    for (const entry of entries) {
      let original: Buffer | null = null
      try {
        original = await readFile(entry.path)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      if (original?.equals(Buffer.from(entry.content))) continue
      originals.set(entry.path, original)
      changed.push(entry)
    }
    if ((await state()).revision !== draft.revision)
      throw new EditorError('构建期间源文件发生变化，请重新载入后合并。', 409)
    const backup =
      '.cake-presentation/backups/' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8)
    for (const [path, original] of originals)
      if (original) await atomic(await localPath(backup + '/' + relative(cwd, path)), original)
    if (changed.length)
      await atomic(
        await localPath(backup + '/saved-draft.json'),
        JSON.stringify({ savedAt: new Date().toISOString(), draft }, null, 2) + '\n'
      )
    const written: string[] = []
    try {
      for (const entry of changed) {
        await atomic(await localPath(relative(cwd, entry.path)), entry.content)
        written.push(entry.path)
      }
    } catch (error) {
      for (const path of written.reverse()) {
        const original = originals.get(path)
        if (original) await atomic(path, original)
        else await rm(path, { force: true })
      }
      throw error
    }
    const saved = await state()
    if (changed.length)
      await atomic(
        await localPath(backup + '/save-result.json'),
        JSON.stringify({ revision: saved.revision, committed: true }) + '\n'
      )
    await resolveAppliedDrafts(saved)
    return { state: saved, backup: changed.length ? backup : null }
  }

  async function resolveAppliedDrafts(saved: EditorState) {
    // A refreshed browser may have a new session ID. Retire older checkpoints whose edits are now saved.
    // These remain on disk as recovery history; only their pending status changes.
    try {
      const directory = await localPath(`.cake-presentation/drafts/${projectId}`)
      for (const file of await readdir(directory)) {
        if (!/^[a-zA-Z0-9-]+\.json$/.test(file)) continue
        const path = await checkpointPath(file.slice(0, -5))
        const text = await readFile(path, 'utf8')
        const record = JSON.parse(text)
        if (record.resolved) continue
        const merged = mergeDraft(record.draft, saved)
        if (
          merged.conflicts.length ||
          !sameValue(merged.draft.documents, saved.documents) ||
          !sameValue(merged.draft.assets, saved.assets) ||
          Object.keys(merged.draft.uploads).length
        )
          continue
        if ((await readFile(path, 'utf8')) !== text) continue
        await atomic(path, JSON.stringify({ ...record, resolved: true, savedRevision: saved.revision }, null, 2) + '\n')
      }
    } catch {
      // A recoverable checkpoint must never turn a completed source save into a reported failure.
    }
  }

  function sessionId(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value)) throw new EditorError('草稿会话无效。')
    return value
  }
  async function checkpointPath(id: string) {
    return localPath(`.cake-presentation/drafts/${projectId}/${sessionId(id)}.json`)
  }
  async function checkpoint(input: unknown) {
    if (!object(input) || !Number.isSafeInteger(input.sequence) || Number(input.sequence) < 1)
      throw new EditorError('草稿备份格式无效。')
    const id = sessionId(input.sessionId)
    const path = await checkpointPath(id)
    let previous: Record<string, unknown> | null = null
    try {
      previous = JSON.parse(await readFile(path, 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    if (previous && Number(previous.sequence) >= Number(input.sequence))
      return { file: relative(cwd, path), ignored: true }
    // Checkpoints are inert recovery JSON, not editable source. Preserve even temporarily incomplete fields.
    if (
      !input.resolved &&
      (!object(input.draft) ||
        !Array.isArray(input.draft.documents) ||
        typeof input.draft.revision !== 'string' ||
        !object(input.draft.assets) ||
        !object(input.draft.uploads))
    )
      throw new EditorError('草稿备份结构无效。')
    if (input.resolved && !previous) return { file: null }
    const record = {
      sessionId: id,
      sequence: input.sequence,
      updatedAt: new Date().toISOString(),
      resolved: !!input.resolved,
      draft: input.resolved ? previous!.draft : input.draft,
    }
    await atomic(path, JSON.stringify(record, null, 2) + '\n')
    return { file: relative(cwd, path) }
  }

  const styles = await readFile(new URL('./ui.css', import.meta.url), 'utf8')
  const script = (await readFile(new URL('./ui.js', import.meta.url), 'utf8')).replace(/<\/script/gi, '<\\/script')
  const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="cake-editor-token" content="${token}"><title>Presentation Toolkit · 编辑器</title><link rel="icon" href="data:,"><style>${styles}</style></head><body><div id="editor"></div><script type="module">${script}</script></body></html>`
  const server = createServer((request, response) => {
    void (async () => {
      response.setHeader('X-Content-Type-Options', 'nosniff')
      response.setHeader('Content-Security-Policy', "frame-ancestors 'self'")
      const address = server.address()
      const host = address && typeof address !== 'string' ? `127.0.0.1:${address.port}` : ''
      if (request.headers.host !== host) throw new EditorError('Host 不匹配。', 403)
      if (request.headers.origin && request.headers.origin !== 'http://' + host)
        throw new EditorError('只接受当前编辑器的请求。', 403)
      const url = new URL(request.url || '/', 'http://' + host)
      if (request.method === 'GET' && url.pathname === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(page)
        return
      }
      if (request.method === 'GET' && url.pathname === '/preview') {
        const html = previews.get(url.searchParams.get('key') || '')
        if (!html) throw new EditorError('预览已过期，请在编辑器中重新预览。', 404)
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(html)
        return
      }
      if (request.method === 'GET' && url.pathname === '/favicon.ico') {
        response.writeHead(204).end()
        return
      }
      if (request.headers['x-cake-editor-token'] !== token) throw new EditorError('请从当前编辑器页面发起请求。', 403)
      if (request.method === 'GET' && url.pathname === '/api/drafts') {
        const directory = await localPath(`.cake-presentation/drafts/${projectId}`)
        let files: string[] = []
        try {
          files = await readdir(directory)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
        const records = await Promise.all(
          files
            .filter((file) => /^[a-zA-Z0-9-]+\.json$/.test(file))
            .map(async (file) => {
              const record = JSON.parse(await readFile(await checkpointPath(file.slice(0, -5)), 'utf8'))
              return record.resolved
                ? null
                : { sessionId: record.sessionId, updatedAt: record.updatedAt, revision: record.draft.revision }
            })
        )
        json(
          response,
          200,
          records.filter(Boolean).sort((a, b) => b!.updatedAt.localeCompare(a!.updatedAt))
        )
        return
      }
      if (request.method === 'GET' && url.pathname.startsWith('/api/drafts/')) {
        const path = await checkpointPath(url.pathname.slice('/api/drafts/'.length))
        json(response, 200, JSON.parse(await readFile(path, 'utf8')))
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/drafts') {
        const input = await body(request)
        const action = mutationQueue.then(async () => json(response, 200, await checkpoint(input)))
        mutationQueue = action.catch(() => undefined)
        await action
        return
      }
      if (request.method === 'GET' && ['/api/state', '/api/revision'].includes(url.pathname)) {
        const current = await state()
        json(
          response,
          200,
          url.pathname === '/api/state'
            ? current
            : { revision: current.revision, sourceRevision: await sourceRevision() }
        )
        return
      }
      if (request.method === 'POST' && url.pathname === '/api/preview') {
        const draft = await validateDraft(await body(request), await state())
        const result = await renderDraft(draft)
        const key = randomUUID()
        previews.set(key, editorPreviewHtml(result.html))
        while (previews.size > 6) previews.delete(previews.keys().next().value!)
        json(response, 200, { url: '/preview?key=' + key, sourceRevision: await sourceRevision() })
        return
      }
      if (request.method === 'POST' && ['/api/save', '/api/export'].includes(url.pathname)) {
        const input = await body(request)
        const action = mutationQueue.then(async () => {
          const draft = await validateDraft(input, await state())
          const saved = await save(draft)
          if (url.pathname === '/api/export') {
            const result = await buildPresentation(config, { cwd })
            json(response, 200, { ...saved, outfile: relative(cwd, result.outfile), bytes: result.bytes })
          } else json(response, 200, saved)
        })
        mutationQueue = action.catch(() => undefined)
        await action
        return
      }
      throw new EditorError('Not found', 404)
    })().catch((error: unknown) => {
      if (!response.headersSent)
        json(response, error instanceof EditorError ? error.status : 500, {
          error: error instanceof Error ? error.message : String(error),
        })
      else response.end()
    })
  })
  await state()
  await new Promise<void>((done, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject)
      done()
    })
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Editor has no TCP address.')
  return {
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      await mutationQueue
      await new Promise<void>((done) => {
        server.close(() => done())
        server.closeAllConnections()
      })
    },
  }
}
