import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'
import { compileString } from 'sass'
import ts from 'typescript'

const root = fileURLToPath(new URL('..', import.meta.url))
const check = process.argv.includes('--check')
const config = await resolveConfig(resolve(root, 'docs/ai.md'))
function read(path) {
  return readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n')
}
function parse(path) {
  return ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}
const pkg = JSON.parse(read('package.json'))
const body = read('docs/ai.md').trim()
const components = []
const declarations = []
const reactTypes = new Set()
const componentGroups = []

for (const entryPath of ['src/index.ts', 'src/presentation/index.ts']) {
  const group = { entry: entryPath, components: [] }
  componentGroups.push(group)
  for (const entry of parse(entryPath).statements) {
    assert(
      ts.isExportDeclaration(entry) && entry.moduleSpecifier,
      'Review docs generator for the new public export syntax.'
    )
    const module = entry.moduleSpecifier.text.replace(/^\.\//, entryPath.replace(/index\.ts$/, ''))
    const path = existsSync(resolve(root, module + '.ts')) ? module + '.ts' : module + '/index.tsx'
    const source = parse(path)
    const names = entry.exportClause?.elements?.map((element) => (element.propertyName ?? element.name).text)
    for (const node of source.statements) {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === 'react') {
        for (const specifier of node.importClause?.namedBindings?.elements ?? []) {
          if (node.importClause.isTypeOnly || specifier.isTypeOnly) reactTypes.add(specifier.name.text)
        }
      }
      if (!node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue
      assert(node.name, `Unnamed public export in ${path}; review documentation generation.`)
      const name = node.name.text
      if (names && !names.includes(name)) continue
      if (ts.isFunctionDeclaration(node)) {
        assert(/^[A-Z]/.test(name), `New non-component export ${name} needs documentation support.`)
        assert(body.includes(`\n### ${name}\n`), `Missing a dedicated ### ${name} section in docs/ai.md.`)
        components.push(name)
        group.components.push(name)
      } else {
        assert(
          ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node),
          `Unsupported public declaration ${name}.`
        )
        declarations.push(node.getText(source))
      }
    }
  }
}
assert(new Set(components).size === components.length, 'Duplicate component exports.')
const documented = [...body.matchAll(/^### ([A-Z][A-Za-z]+)$/gm)].map((match) => match[1])
assert.deepEqual(documented.sort(), [...components].sort(), 'Component reference must match the public entry exactly.')
const examples = [...body.matchAll(/^```tsx example=([\w-]+)\n([\s\S]*?)^```/gm)]
assert(
  examples.length > 0 && new Set(examples.map((match) => match[1])).size === examples.length,
  'Examples need unique names.'
)

// Compile the actual provider mixins, so theme tables cannot drift from SCSS.
const themeDeclaration = parse('src/components/CakeProvider/index.tsx').statements.find(
  (node) => ts.isTypeAliasDeclaration(node) && node.name.text === 'CakeTheme'
)
assert(themeDeclaration && ts.isUnionTypeNode(themeDeclaration.type), 'CakeTheme must list the documented themes.')
const themes = themeDeclaration.type.types.map((node) => {
  assert(ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal), 'Review new CakeTheme syntax.')
  return node.literal.text
})
const combinations = themes.flatMap((theme) => ['light', 'dark'].map((mode) => ({ theme, mode })))
const sass = `@use 'src/components/CakeProvider/index' as tokens;
${combinations
  .map(
    ({ theme, mode }) => `.cake-doc-${theme}-${mode} {
  @include tokens.${mode};
  @include tokens.blue${mode === 'dark' ? '-dark' : ''};
  ${theme === 'blue' ? '' : `@include tokens.${theme}${mode === 'dark' ? '-dark' : ''};`}
}`
  )
  .join('\n')}`
const css = compileString(sass, { loadPaths: [root] }).css
function variables(block) {
  assert(block, 'Cannot extract theme variables; review changed provider structure.')
  return Object.fromEntries(
    [...block.matchAll(/(--cake-[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].replace(/\s+/g, ' ').trim()])
  )
}
const base = variables(css.match(/:root,\s*\.cake-theme\s*\{([^}]+)\}/)?.[1])
const palettes = combinations.map(({ theme, mode }) => ({
  ...base,
  ...variables(css.match(new RegExp(`\\.cake-doc-${theme}-${mode}\\s*\\{([^}]+)\\}`))?.[1]),
}))
const keys = [...new Set(palettes.flatMap((palette) => Object.keys(palette)))].sort()
const shared = keys.filter((key) => palettes.every((palette) => palette[key] === palettes[0][key]))
const colors = keys.filter((key) => !shared.includes(key))
const tokenTables = `以下取 comfortable 密度、未开启减少动态效果时的值。compact 与 reduced-motion 的覆盖规则见正文。

### 共用变量

| 变量 | 值 |
| --- | --- |
${shared.map((key) => `| \`${key}\` | \`${palettes[0][key]}\` |`).join('\n')}

### 六套配色的变量

| 变量 | ${combinations.map(({ theme, mode }) => `${theme} / ${mode}`).join(' | ')} |
| --- | ${combinations.map(() => '---').join(' | ')} |
${colors.map((key) => `| \`${key}\` | ${palettes.map((palette) => `\`${palette[key]}\``).join(' | ')} |`).join('\n')}`

const sources = [
  'docs/ai.md',
  'package.json',
  ...readdirSync(resolve(root, 'src'), { recursive: true })
    .filter((path) => /\.(tsx?|scss)$/.test(path))
    .map((path) => `src/${path.replaceAll('\\', '/')}`),
].sort()
const digest = createHash('sha256')
for (const path of sources) digest.update(path + '\n' + read(path) + '\n')
const fingerprint = digest.digest('hex')
const fence = '```'
const appendix = await format(
  `import type { ${[...reactTypes].sort().join(', ')} } from 'react'\n\n${declarations.join('\n\n')}\n`,
  { ...config, parser: 'typescript' }
)
const full = await format(
  `${body}

## 附录 A. 当前构建身份与公开导出

- 包名：${pkg.name}
- 版本：${pkg.version}
- 署名：${pkg.author}
- React peer：${pkg.peerDependencies.react}；React DOM peer：${pkg.peerDependencies['react-dom']}
- 公开组件：${components.length} 个；下列分组分别与两个公开入口一致。
- 文档 / package.json / src 内容指纹（SHA-256）：${fingerprint}
- 本文为生成结果，请修改 docs/ai.md 或相应源码后运行 npm run docs:build。

${componentGroups.map((group) => `- ${group.entry}（${group.components.length} 个）：${group.components.join(', ')}`).join('\n')}

## 附录 B. 完整公开 Props 与类型

下列声明直接提取自公开入口所导出的源文件；原生属性由 React 类型扩展，不在这里重复 React 的完整 DOM 类型。组件对应同名 Props，例如 Button 使用 ButtonProps。默认值与行为见正文，类型中的可选标记不表达默认值。

${fence}typescript
${appendix}${fence}

## 附录 C. 从 SCSS 生成的主题变量

${tokenTables}
`,
  { ...config, parser: 'markdown' }
)
const index = await format(
  `# CakeUI

> React + TypeScript + SCSS UI components. Native HTML props, composable JSX children. Default blue theme. Author: ${pkg.author}. Version: ${pkg.version}.

安装：npm install ${pkg.name}。需要 React / React DOM 19+。基础组件显式导入 ${pkg.name}/style.css；HTML 幻灯片从 ${pkg.name}/presentation 导入，样式为 ${pkg.name}/presentation/style.css。presentation 是同包的 Web 子入口，不是 RN 包；新增入口尚未包含于已发布的 0.3.0，当前请安装本仓库打包产物。包名包含 @a1knla/ scope，品牌名和 GitHub 仓库仍为 CakeUI / cakeui。不要凭其他 UI 库的习惯猜测 API。

CDN：普通 HTML 使用 <link rel="stylesheet" href="https://vanillacake.cn/cakeui-dist/cakeui.css"> 和 <script src="https://vanillacake.cn/cakeui-dist/cakeui.min.js"></script>。无需 npm、另引 React 或构建工具；基础组件从 CakeUI 取用，幻灯片从 CakeUI.presentation 取用，使用 CakeUI.React.createElement 和 CakeUI.createRoot 挂载。CDN 与 npm 的组件 Props 相同。完整文档第 2 节分别提供 npm / CDN 的基础组件和幻灯片示例，以及本地打包、离线与版本规则。

## 文档 / Documentation

- [完整技术文档 / Full technical reference](https://gallery.vanillacake.cn/llms-full.txt): UTF-8 text/plain；${components.length} 个组件的 API、默认值、原生属性、ref、交互边界、主题变量、可编译示例和开发维护规则。生成代码前优先读取。
- [Gallery 阅读页](https://gallery.vanillacake.cn/?page=docs): 同一份全文，可选择复制。
- [HTML 幻灯片](https://gallery.vanillacake.cn/?page=presentation): 逐页演示、连续阅读、全屏与打印；独立页 /slides.html。
- [CDN / 外部 script 示例](https://gallery.vanillacake.cn/browser.html): 普通 HTML 使用内置 React 的完整浏览器构建。默认 URL 随稳定发版更新，固定版本使用 releases/<版本>/；初次部署为源码预览，查看 manifest.json 的 source。
- [源码](https://github.com/hatsune-miku/cakeui): 基础入口 src/index.ts，幻灯片入口 src/presentation/index.ts；Props 在对应 components/*/index.tsx。
- [维护规则](https://github.com/hatsune-miku/cakeui/blob/main/AGENTS.md): 每次改动都评估并同步受影响文档。

## API 提醒 / Key constraints

- Inputs use native onChange(event), value / defaultValue / checked. Tabs uses onValueChange(value).
- Button defaults to type="button". Table and ListView take children, not columns / dataSource.
- ContextMenu interactive defaults to false: right-down opens and depresses the region; right-release selects only an enabled item under the pointer, otherwise the menu stays open.
- ComboBox is a native select with option / optgroup; customizable picker appearance depends on browser support.
- No Drawer or SidePanel. Global text selection defaults to none; input and log areas explicitly allow selection.
- Presentation CSS is independent and scoped. SlideDeck takes Slide children (including arrays/fragments), not a slides data schema. Keyboard navigation is scoped to the focused deck; printing exposes all slides.

完整文档内容指纹（SHA-256）：${fingerprint}
`,
  { ...config, parser: 'markdown' }
)

for (const [name, content] of [
  ['llms.txt', index],
  ['llms-full.txt', full],
]) {
  const path = `public/${name}`
  if (check)
    assert(
      existsSync(resolve(root, path)) && read(path) === content,
      `${path} is stale. Review docs/ai.md and run npm run docs:build.`
    )
  else {
    mkdirSync(resolve(root, 'public'), { recursive: true })
    writeFileSync(resolve(root, path), content)
  }
}
console.log(
  `Documentation ${check ? 'verified' : 'generated'}: ${components.length} components, ${examples.length} examples, ${keys.length} theme variables.`
)
