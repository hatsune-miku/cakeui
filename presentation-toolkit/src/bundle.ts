import { type BuildOptions, type BuildResult, type Plugin } from 'esbuild'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileAsync } from 'sass'

import { assetPlugin } from './assets.js'
import type { PresentationBuild, PresentationConfig } from './index.js'

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  )
}

function offlinePlugin(watchedSources?: Set<string>): Plugin {
  const sassInputs = new Map<string, string[]>()
  return {
    name: 'presentation-local-resources',
    setup(builder) {
      builder.onResolve({ filter: /^(https?:)?\/\// }, (args) => ({
        errors: [{ text: `Use a local import for offline resources: ${args.path}` }],
      }))
      builder.onLoad({ filter: /\.s[ac]ss$/ }, async (args) => {
        try {
          const result = await compileAsync(args.path, { style: 'expanded', charset: false })
          const watchFiles = result.loadedUrls
            .filter((url) => url.protocol === 'file:')
            .map((url) => fileURLToPath(url))
          sassInputs.set(args.path, watchFiles)
          for (const file of watchFiles) watchedSources?.add(file)
          return {
            contents: result.css,
            loader: 'css',
            resolveDir: dirname(args.path),
            watchFiles,
          }
        } catch (error) {
          const spanUrl = (error as { span?: { url?: URL } }).span?.url
          const watchFiles = [...(sassInputs.get(args.path) ?? [args.path])]
          if (spanUrl?.protocol === 'file:') watchFiles.push(fileURLToPath(spanUrl))
          return {
            errors: [{ text: String(error) }],
            watchFiles,
            watchDirs: [...new Set(watchFiles.map(dirname))],
          }
        }
      })
    },
  }
}

export function bundleOptions(config: PresentationConfig, cwd: string, watchedSources?: Set<string>): BuildOptions {
  const entry = resolve(cwd, config.entry)
  const outfile = resolve(cwd, config.outfile)
  if (entry === outfile) throw new Error('The output must not overwrite the entry file.')
  return {
    absWorkingDir: cwd,
    entryPoints: [entry],
    outfile: resolve(cwd, '.cake-presentation-memory.js'),
    bundle: true,
    write: false,
    metafile: true,
    splitting: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    minify: config.minify ?? true,
    legalComments: 'inline',
    logLevel: 'silent',
    plugins: [assetPlugin(config, cwd), offlinePlugin(watchedSources)],
    loader: {
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.jpeg': 'dataurl',
      '.gif': 'dataurl',
      '.webp': 'dataurl',
      '.avif': 'dataurl',
      '.svg': 'dataurl',
      '.ico': 'dataurl',
      '.woff': 'dataurl',
      '.woff2': 'dataurl',
      '.ttf': 'dataurl',
      '.otf': 'dataurl',
      '.mp4': 'dataurl',
      '.webm': 'dataurl',
      '.mp3': 'dataurl',
      '.wav': 'dataurl',
    },
  }
}

export function renderPresentation(result: BuildResult, config: PresentationConfig, cwd: string): PresentationBuild {
  if (!result.outputFiles || !result.metafile) throw new Error('The build did not produce an in-memory bundle.')
  const outfile = resolve(cwd, config.outfile)
  const js = result.outputFiles.filter((file) => file.path.endsWith('.js'))
  const css = result.outputFiles.filter((file) => file.path.endsWith('.css'))
  if (js.length !== 1 || js.length + css.length !== result.outputFiles.length)
    throw new Error('The build produced unexpected external files.')
  for (const output of Object.values(result.metafile.outputs)) {
    if (output.imports.some((item) => item.external && !item.path.startsWith('data:'))) {
      throw new Error('The build contains an external runtime dependency.')
    }
  }
  const script = js[0].text.replace(/<\/script/gi, '<\\/script')
  const styles = css
    .map((file) => file.text)
    .join('\n')
    .replace(/<\/style/gi, '<\\/style')
  const html = `<!doctype html>
<html lang="${escapeHtml(config.lang ?? 'zh-CN')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="description" content="${escapeHtml(config.description ?? '')}">
<title>${escapeHtml(config.title)}</title>
<link rel="icon" href="data:,">
<style>${styles}</style>
</head>
<body>
<div id="app"></div>
<noscript>请启用 JavaScript 查看演示。本文件包含运行资源，无需联网。</noscript>
<script>${script}</script>
</body>
</html>
`
  return { html, outfile, bytes: Buffer.byteLength(html), inputs: Object.keys(result.metafile.inputs) }
}
