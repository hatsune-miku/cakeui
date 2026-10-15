import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { chromium } from '@playwright/test'

import { startEditor } from '../dist/editor/server.js'

const cwd = await mkdtemp(join(tmpdir(), 'cake-editor-focus-'))
const serverConfig = {
  entry: 'main.ts',
  outfile: 'deck.html',
  title: 'Focus regression',
  editor: { files: ['pages.json'], schema: 'schema.json' },
}
await writeFile(join(cwd, 'presentation.config.json'), JSON.stringify(serverConfig))
await writeFile(
  join(cwd, 'pages.json'),
  JSON.stringify([
    { id: 'first', type: 'text', title: 'Original title', items: ['Original item'], rows: [['Key', 'Original value']] },
  ])
)
await writeFile(
  join(cwd, 'schema.json'),
  JSON.stringify({
    version: 1,
    fields: [{ key: 'title', type: 'textarea', label: '标题' }],
    types: {
      text: {
        label: '文字',
        fields: [
          { key: 'items', type: 'list', label: '条目' },
          { key: 'rows', type: 'table', label: '表格', columns: ['名称', '正文'] },
        ],
      },
    },
  })
)
const entry = `import pages from './pages.json';
const app = document.getElementById('app');
app.innerHTML = '<h1></h1><div id="deck" tabindex="0"></div><button id="open">Interact</button><input id="inside" autofocus>';
app.querySelector('h1').textContent = pages[0].title;
document.getElementById('deck').textContent = JSON.stringify(pages);
document.getElementById('deck').focus();
setTimeout(() => document.getElementById('deck').focus(), 80);
document.getElementById('open').onclick = () => document.getElementById('inside').focus();`
await writeFile(join(cwd, 'main.ts'), entry)
const server = await startEditor(join(cwd, 'presentation.config.json'), 0)
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.platform === 'win32'
    ? {
        executablePath:
          process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      }
    : {}),
})
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(server.url)
  const frame = page.frameLocator('iframe')
  await frame.locator('h1').waitFor()
  const title = page.getByRole('textbox', { name: '标题', exact: true })
  async function expectStable(control, value) {
    await control.fill(value)
    await control.evaluate((node) => {
      window.focusRegressionControl = node
      window.focusRegressionBlurCount = 0
      node.addEventListener('blur', () => window.focusRegressionBlurCount++, { once: true })
      node.setSelectionRange(2, 5, 'backward')
    })
    await page.waitForFunction(
      (value) => document.querySelector('iframe').contentDocument?.querySelector('#deck')?.textContent.includes(value),
      value
    )
    // The app also tries to focus after mount, like a passive React effect.
    await page.waitForTimeout(160)
    const state = await page.evaluate(() => {
      const node = window.focusRegressionControl
      return {
        sameNode: node.isConnected,
        focused: document.activeElement === node,
        start: node.selectionStart,
        end: node.selectionEnd,
        direction: node.selectionDirection,
        blurs: window.focusRegressionBlurCount,
      }
    })
    assert.deepEqual(state, { sameNode: true, focused: true, start: 2, end: 5, direction: 'backward', blurs: 0 })
    await page.keyboard.insertText('继续输入')
    assert.equal(await control.inputValue(), value.slice(0, 2) + '继续输入' + value.slice(5))
  }
  await expectStable(title, '连续编辑标题abcdef')
  await expectStable(page.getByRole('textbox', { name: '条目 1', exact: true }), '连续编辑条目abcdef')
  const cell = page.getByRole('textbox', { name: '表格 1 · 正文', exact: true })
  await expectStable(cell, '连续编辑表格abcdef')

  await title.fill('Title changed while switching fields')
  await cell.focus()
  await cell.evaluate((node) => node.setSelectionRange(1, 1))
  await frame.locator('h1').filter({ hasText: 'Title changed while switching fields' }).waitFor()
  await page.waitForTimeout(160)
  assert.equal(await cell.evaluate((node) => document.activeElement === node && node.selectionStart === 1), true)

  // Source-triggered rebuilds must obey the same focus ownership.
  const currentPreview = await page.locator('iframe').getAttribute('src')
  await writeFile(join(cwd, 'main.ts'), entry + '\n// Source reload regression\n')
  await page.waitForFunction((old) => document.querySelector('iframe').getAttribute('src') !== old, currentPreview)
  await frame.locator('h1').waitFor()
  await page.waitForTimeout(160)
  assert.equal(await cell.evaluate((node) => document.activeElement === node), true)

  await frame.getByRole('button', { name: 'Interact' }).click()
  assert.equal(await frame.locator('#inside').evaluate((node) => document.activeElement === node), true)
  await page.keyboard.insertText('preview remains interactive')
  assert.equal(await frame.locator('#inside').inputValue(), 'preview remains interactive')

  const token = await page.locator('meta[name="cake-editor-token"]').getAttribute('content')
  const state = await (await fetch(server.url + '/api/state', { headers: { 'X-Cake-Editor-Token': token } })).json()
  const exported = await fetch(server.url + '/api/export', {
    method: 'POST',
    headers: {
      'X-Cake-Editor-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  })
  assert.equal(exported.status, 200)
  assert.doesNotMatch(await readFile(join(cwd, 'deck.html'), 'utf8'), /cake-editor-preview-focus/)
  assert.deepEqual(errors, [])
  console.log(
    'Preview focus passed: title, list, table, selection, continued typing, switching fields, source reload, preview interaction and standalone export.'
  )
} finally {
  await browser.close()
  await server.close()
  assert.equal(dirname(resolve(cwd)), resolve(tmpdir()))
  assert.ok(basename(cwd).startsWith('cake-editor-focus-'))
  await rm(cwd, { recursive: true, force: true })
}
