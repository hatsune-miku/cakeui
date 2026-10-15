import { type BuildContext, context, formatMessages } from 'esbuild'
import { createHash, randomUUID } from 'node:crypto'
import { unwatchFile, watchFile } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { type ServerResponse, createServer } from 'node:http'
import { resolve } from 'node:path'

import { bundleOptions, renderPresentation } from './bundle.js'
import { previewClient } from './dev-client.js'
import { loadConfig } from './index.js'

/** Internal preview server, intentionally not exported by the package's Node API. */
export async function startPreview(filename: string, port = 4173) {
  const configPath = resolve(filename)
  const instance = randomUUID()
  const clients = new Set<ServerResponse>()
  let state = { revision: '', error: null as string | null }
  let html =
    '<!doctype html><html><head><meta charset="utf-8"><title>Presentation preview</title></head><body></body></html>'
  let builder: BuildContext | undefined
  let closed = false
  let generation = 0
  let configText: string | undefined
  let queue = Promise.resolve()

  function publish(next: typeof state) {
    if (closed || (next.revision === state.revision && next.error === state.error)) return
    state = next
    const message = `data: ${JSON.stringify(state)}\n\n`
    for (const response of clients) response.write(message)
    if (next.error) console.error(next.error)
  }

  function fail(error: unknown) {
    publish({ ...state, error: error instanceof Error ? error.message : String(error) })
  }

  async function rebuildConfig() {
    if (closed) return
    let nextText: string | undefined
    try {
      nextText = await readFile(configPath, 'utf8')
    } catch {
      // loadConfig below reports missing/unreadable configuration; keep watching for recovery.
    }
    if (nextText === configText && generation > 0) return
    configText = nextText
    const current = ++generation
    await builder?.dispose()
    builder = undefined
    if (closed) return
    try {
      const { config, cwd } = await loadConfig(configPath)
      const options = bundleOptions(config, cwd)
      builder = await context({
        ...options,
        write: false,
        metafile: true,
        plugins: [
          ...(options.plugins ?? []),
          {
            name: 'presentation-preview',
            setup(build) {
              build.onEnd(async (result) => {
                if (closed || current !== generation) return
                if (result.errors.length) {
                  const messages = await formatMessages(result.errors, { kind: 'error', color: false })
                  if (!closed && current === generation) fail(messages.join('\n'))
                  return
                }
                try {
                  const output = renderPresentation(result, config, cwd)
                  html = output.html
                  const digest = createHash('sha256').update(html).digest('hex')
                  publish({ revision: `${instance}:${digest}`, error: null })
                } catch (error) {
                  fail(error)
                }
              })
            },
          },
        ],
      })
      // Even after a failed first build, watch must remain active so fixing a file recovers.
      await builder.rebuild().catch(() => undefined)
      if (!closed) await builder.watch({ delay: 100 })
    } catch (error) {
      fail(error)
    }
  }

  function scheduleConfig() {
    queue = queue.then(rebuildConfig).catch(fail)
  }

  const server = createServer((request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end('Method not allowed')
      return
    }
    if (request.url === '/__cake_presentation/events') {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      })
      response.write(`retry: 500\ndata: ${JSON.stringify(state)}\n\n`)
      clients.add(response)
      request.on('close', () => clients.delete(response))
      return
    }
    if (request.url === '/favicon.ico') {
      response.writeHead(204).end()
      return
    }
    if (request.url !== '/' && request.url !== '/index.html') {
      response.writeHead(404).end('Not found')
      return
    }
    const script = `<script data-cake-presentation-dev>(${previewClient.toString()})(${JSON.stringify(state.revision)})</script>`
    const end = html.lastIndexOf('</body>')
    const preview = html.slice(0, end) + script + html.slice(end)
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(preview)
  })
  const heartbeat = setInterval(() => {
    for (const response of clients) response.write(': heartbeat\n\n')
  }, 15000)
  heartbeat.unref()

  async function close() {
    if (closed) return
    closed = true
    unwatchFile(configPath, scheduleConfig)
    clearInterval(heartbeat)
    for (const response of clients) response.end()
    clients.clear()
    const stopped = new Promise<void>((done) => server.close(() => done()))
    server.closeAllConnections()
    await queue
    await builder?.dispose()
    await stopped
  }

  try {
    watchFile(configPath, { interval: 200 }, scheduleConfig)
    scheduleConfig()
    await queue
    await new Promise<void>((done, reject) => {
      server.once('error', reject)
      server.listen(port, '127.0.0.1', () => {
        server.off('error', reject)
        done()
      })
    })
  } catch (error) {
    await close()
    throw error
  }
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Preview has no TCP address.')
  return { url: `http://127.0.0.1:${address.port}`, close }
}
