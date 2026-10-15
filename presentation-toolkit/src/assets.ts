import type { Plugin } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import type { PresentationConfig } from './index.js'

/** Images remain ordinary local files; the manifest is an editable key-to-path map. */
export function assetPlugin(config: PresentationConfig, cwd: string, draft?: Record<string, string>): Plugin {
  return {
    name: 'presentation-assets',
    setup(builder) {
      builder.onResolve({ filter: /^cake-presentation:assets$/ }, () => ({
        path: 'assets',
        namespace: 'presentation-assets',
      }))
      builder.onLoad({ filter: /.*/, namespace: 'presentation-assets' }, async () => {
        if (!config.assets)
          throw new Error('The cake-presentation:assets import requires an assets manifest in the configuration.')
        const filename = resolve(cwd, config.assets)
        const assets: unknown = draft ?? JSON.parse(await readFile(filename, 'utf8'))
        if (!assets || typeof assets !== 'object' || Array.isArray(assets))
          throw new Error('Assets must be a key-to-path object.')
        const entries = Object.entries(assets)
        const imports = entries.map(([key, value], i) => {
          if (typeof value !== 'string' || !value.trim() || /^(?:\w+:|\/\/)/.test(value))
            throw new Error(`Asset ${key} must refer to a local path relative to the manifest.`)
          return `import asset${i} from ${JSON.stringify(resolve(dirname(filename), value))};`
        })
        return {
          contents:
            imports.join('\n') +
            '\nexport default {' +
            entries.map(([key], i) => `${JSON.stringify(key)}:asset${i}`).join(',') +
            '};',
          loader: 'js',
          resolveDir: cwd,
          watchFiles: [filename],
        }
      })
    },
  }
}
