import { build } from 'esbuild'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'

import { bundleOptions, renderPresentation } from './bundle.js'

export type { EditorField, EditorSchema } from './editor/types.js'

export interface PresentationConfig {
  /** TSX/JS entry, relative to the configuration file. */
  entry: string
  /** Output .html path, relative to the configuration file. */
  outfile: string
  title: string
  description?: string
  lang?: string
  minify?: boolean
  /** Key-to-local-path JSON manifest, imported as cake-presentation:assets. */
  assets?: string
  /** Opt-in structured editing; ordinary build/dev projects need no editor configuration. */
  editor?: {
    files: string[]
    schema: string
    assetsDirectory?: string
  }
}

export interface BuildOptions {
  /** Directory used to resolve the configuration's paths. */
  cwd?: string
  /** false returns the HTML without writing an output file. */
  write?: boolean
}

export interface PresentationBuild {
  html: string
  outfile: string
  bytes: number
  inputs: string[]
}

export function definePresentation(config: PresentationConfig): PresentationConfig {
  return config
}

export function validateConfig(value: unknown): asserts value is PresentationConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuration must be an object.')
  const config = value as Record<string, unknown>
  const allowed = new Set(['entry', 'outfile', 'title', 'description', 'lang', 'minify', 'assets', 'editor'])
  for (const key of Object.keys(config))
    if (!allowed.has(key)) throw new Error(`Unknown configuration property: ${key}`)
  for (const key of ['entry', 'outfile', 'title']) {
    if (typeof config[key] !== 'string' || !config[key].trim())
      throw new Error(`Configuration requires a non-empty ${key}.`)
  }
  for (const key of ['description', 'lang', 'assets']) {
    if (config[key] !== undefined && typeof config[key] !== 'string') throw new Error(`${key} must be a string.`)
  }
  if (config.minify !== undefined && typeof config.minify !== 'boolean') throw new Error('minify must be a boolean.')
  if (config.editor !== undefined) {
    const editor = config.editor as PresentationConfig['editor']
    if (!editor || typeof editor !== 'object' || Array.isArray(editor)) throw new Error('editor must be an object.')
    for (const key of Object.keys(editor))
      if (!['files', 'schema', 'assetsDirectory'].includes(key)) throw new Error(`Unknown editor property: ${key}`)
    if (
      !Array.isArray(editor.files) ||
      !editor.files.length ||
      editor.files.some((file) => typeof file !== 'string' || !file.trim())
    )
      throw new Error('editor.files must list JSON content files.')
    if (new Set(editor.files).size !== editor.files.length) throw new Error('editor.files must not contain duplicates.')
    if (typeof editor.schema !== 'string' || !editor.schema.trim()) throw new Error('editor.schema is required.')
    if (
      editor.assetsDirectory !== undefined &&
      (typeof editor.assetsDirectory !== 'string' || !editor.assetsDirectory.trim())
    )
      throw new Error('editor.assetsDirectory must be a non-empty string.')
    if (editor.assetsDirectory && !config.assets) throw new Error('editor.assetsDirectory requires an assets manifest.')
  }
  if (extname(config.outfile as string).toLowerCase() !== '.html') throw new Error('outfile must end in .html.')
}

export async function loadConfig(filename: string): Promise<{ config: PresentationConfig; cwd: string }> {
  const path = resolve(filename)
  const config: unknown = JSON.parse(await readFile(path, 'utf8'))
  validateConfig(config)
  return { config, cwd: dirname(path) }
}

export async function buildPresentation(
  config: PresentationConfig,
  options: BuildOptions = {}
): Promise<PresentationBuild> {
  validateConfig(config)
  const cwd = resolve(options.cwd ?? process.cwd())
  const result = await build({ ...bundleOptions(config, cwd), write: false, metafile: true })
  const presentation = renderPresentation(result, config, cwd)
  const { html, outfile } = presentation
  if (options.write !== false) {
    await mkdir(dirname(outfile), { recursive: true })
    const temporary = `${outfile}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, html, 'utf8')
      await rename(temporary, outfile)
    } finally {
      await rm(temporary, { force: true })
    }
  }
  return presentation
}
