#!/usr/bin/env node
import { startPreview } from './dev.js'
import { startEditor } from './editor/server.js'
import { buildPresentation, loadConfig } from './index.js'

async function main() {
  const args = process.argv.slice(2)
  if (!args.length || args.includes('--help')) {
    console.log('cake-presentation build|dev|edit [--config presentation.config.json] [--port 4173]')
    return
  }
  const command = args.shift()
  if (command !== 'build' && command !== 'dev' && command !== 'edit') throw new Error(`Unknown command: ${command}`)
  let filename = 'presentation.config.json'
  let port = command === 'edit' ? 4174 : 4173
  while (args.length) {
    const flag = args.shift()
    const value = args.shift()
    if (!value) throw new Error(`Missing value for ${flag}`)
    if (flag === '--config') filename = value
    else if (flag === '--port' && command !== 'build') port = Number(value)
    else throw new Error(`Unknown option: ${flag}`)
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('port must be between 1 and 65535.')
  if (command === 'build') {
    const initial = await loadConfig(filename)
    const result = await buildPresentation(initial.config, { cwd: initial.cwd })
    console.log(`${result.outfile}\n${result.bytes.toLocaleString()} bytes; ${result.inputs.length} bundled inputs`)
    return
  }
  const preview = command === 'edit' ? await startEditor(filename, port) : await startPreview(filename, port)
  console.log(
    command === 'edit'
      ? `${preview.url} — structured presentation editor`
      : `${preview.url} — live reload enabled; save files to update the browser`
  )
  process.once('SIGINT', () => void preview.close())
  process.once('SIGTERM', () => void preview.close())
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
