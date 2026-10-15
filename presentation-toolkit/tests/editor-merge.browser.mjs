import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import { chromium, expect } from '@playwright/test'

import { startEditor } from '../dist/editor/server.js'

const cwd = await mkdtemp(join(tmpdir(), 'cake-editor-merge-'))
const config = {
  entry: 'main.ts',
  outfile: 'deck.html',
  title: 'Merge regression',
  editor: { files: ['pages.json'], schema: 'schema.json' },
}
const original = [
  { id: 'first', type: 'text', title: 'Original title', notes: 'Original note', items: ['One', 'Two'] },
  { id: 'second', type: 'text', title: 'Second title', notes: 'Second note', items: [] },
]
await writeFile(join(cwd, 'presentation.config.json'), JSON.stringify(config))
await writeFile(join(cwd, 'pages.json'), JSON.stringify(original))
await writeFile(
  join(cwd, 'schema.json'),
  JSON.stringify({
    version: 1,
    fields: [{ key: 'title', label: '标题', type: 'textarea' }],
    types: {
      text: {
        label: '文字页',
        fields: [
          { key: 'notes', label: '备注', type: 'textarea' },
          { key: 'items', label: '条目', type: 'list' },
        ],
      },
    },
  })
)
await writeFile(
  join(cwd, 'main.ts'),
  `import pages from './pages.json'; document.getElementById('app').textContent = JSON.stringify(pages);`
)
const server = await startEditor(join(cwd, 'presentation.config.json'), 0)
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === 'win32' ? { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } : {}),
})
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(server.url)
  const title = page.getByRole('textbox', { name: '标题', exact: true })
  const note = page.getByRole('textbox', { name: '备注', exact: true })
  await expect(title).toHaveValue('Original title')
  const token = await page.locator('meta[name="cake-editor-token"]').getAttribute('content')
  const api = async (path) =>
    (await fetch(server.url + '/api/' + path, { headers: { 'X-Cake-Editor-Token': token } })).json()

  await title.fill('Manual title')
  await title.evaluate((el) => el.setSelectionRange(2, 5))
  await expect(page.locator('.editor-save-status')).toContainText('已备份到工程')
  assert.deepEqual(JSON.parse(await readFile(join(cwd, 'pages.json'), 'utf8')), original)
  const checkpoint = (await api('drafts'))[0]
  assert.equal((await api('drafts/' + checkpoint.sessionId)).draft.documents[0].pages[0].title, 'Manual title')
  const external = structuredClone(original)
  external[0].notes = 'Source note'
  external.push({ id: 'third', type: 'text', title: 'Assistant new page', notes: '', items: [] })
  await writeFile(join(cwd, 'pages.json'), JSON.stringify(external))
  await expect(note).toHaveValue('Source note', { timeout: 15000 })
  assert.equal(await title.inputValue(), 'Manual title')
  assert.equal(
    await title.evaluate((el) => el === document.activeElement && el.selectionStart === 2 && el.selectionEnd === 5),
    true
  )
  await expect(page.locator('.editor-page')).toHaveCount(3)
  assert.equal(JSON.parse(await readFile(join(cwd, 'pages.json'), 'utf8'))[0].title, 'Original title')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.editor-save-status')).toHaveText('已与源文件同步')
  assert.equal(JSON.parse(await readFile(join(cwd, 'pages.json'), 'utf8'))[0].title, 'Manual title')

  // A save conflict offers both values and never writes until it is resolved.
  await title.fill('Manual conflict')
  const conflicting = JSON.parse(await readFile(join(cwd, 'pages.json'), 'utf8'))
  conflicting[0].title = 'External conflict'
  await writeFile(join(cwd, 'pages.json'), JSON.stringify(conflicting))
  await expect(page.getByRole('button', { name: '合并外部修改', exact: true })).toBeVisible({ timeout: 15000 })
  await expect(title).toHaveValue('Manual conflict')
  await page.getByRole('button', { name: '合并外部修改', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '选择要保留的修改' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Manual conflict')
  await expect(dialog).toContainText('External conflict')
  await expect(dialog.getByRole('button', { name: '合并到草稿' })).toBeDisabled()
  if (process.env.CAKE_EDITOR_QA_DIR) {
    const { mkdir } = await import('node:fs/promises')
    await mkdir(process.env.CAKE_EDITOR_QA_DIR, { recursive: true })
    await page.screenshot({ path: join(process.env.CAKE_EDITOR_QA_DIR, 'editor-merge-conflicts.png') })
  }
  await dialog.getByRole('combobox').selectOption('draft')
  await dialog.getByRole('button', { name: '合并到草稿' }).click()
  await expect(title).toHaveValue('Manual conflict')
  assert.equal(JSON.parse(await readFile(join(cwd, 'pages.json'), 'utf8'))[0].title, 'External conflict')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.editor-save-status')).toHaveText('已与源文件同步')

  // Refresh restores an unsaved draft against newer source, and the original title-key format is accepted.
  await note.fill('Unsent browser note')
  const browserDraft = await page.evaluate(() =>
    JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('cake-presentation-draft:'))))
  )
  const newer = JSON.parse(await readFile(join(cwd, 'pages.json'), 'utf8'))
  newer[1].title = 'Newer second title'
  await writeFile(join(cwd, 'pages.json'), JSON.stringify(newer))
  page.on('dialog', (dialog) => dialog.accept())
  await page.reload()
  await expect(note).toHaveValue('Unsent browser note')
  await expect(page.locator('.editor-page[data-id="second"]')).toContainText('Newer second title')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.editor-save-status')).toHaveText('已与源文件同步')

  // Delay a source read and type while it is in flight: the late response must not reset the input.
  const raced = JSON.parse(await readFile(join(cwd, 'pages.json'), 'utf8'))
  raced[1].notes = 'Race source note'
  await writeFile(join(cwd, 'pages.json'), JSON.stringify(raced))
  let release
  const held = new Promise((resolve) => {
    release = resolve
  })
  let began
  const started = new Promise((resolve) => {
    began = resolve
  })
  await page.route('**/api/state', async (route) => {
    const response = await route.fetch()
    began()
    await held
    await route.fulfill({ response })
  })
  await started
  await title.fill('Typed during source fetch')
  release()
  await expect(title).toHaveValue('Typed during source fetch')
  await page.unroute('**/api/state')
  await page.getByRole('button', { name: '同步源文件', exact: true }).click()
  await expect(title).toHaveValue('Typed during source fetch')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.editor-save-status')).toHaveText('已与源文件同步')

  // An old draft without a merge base is protected before the user decides how to handle it.
  const legacy = structuredClone(browserDraft)
  delete legacy.base
  legacy.revision = 'unavailable-old-source'
  legacy.documents[0].pages[0].title = 'Legacy manual title'
  await page.evaluate(
    ({ draft, title }) => {
      localStorage.clear()
      localStorage.setItem('cake-presentation-draft:' + title, JSON.stringify(draft))
    },
    { draft: legacy, title: config.title }
  )
  await page.reload()
  await expect(page.getByRole('button', { name: '恢复本地草稿' })).toBeVisible()
  await expect(page.locator('.editor-inspector')).toHaveJSProperty('inert', true)
  await page.getByRole('button', { name: '恢复本地草稿' }).click()
  await expect(dialog).toBeVisible()
  for (const choice of await dialog.getByRole('combobox').all()) {
    const label = await choice.getAttribute('aria-label')
    await choice.selectOption(label.endsWith('· 标题') && label.includes('Legacy manual title') ? 'draft' : 'source')
  }
  await dialog.getByRole('button', { name: '合并到草稿' }).click()
  await expect(title).toHaveValue('Legacy manual title')
  await expect(page.locator('.editor-page[data-id="second"]')).toContainText('Newer second title')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.editor-save-status')).toHaveText('已与源文件同步')
  assert.deepEqual(await api('drafts'), [])

  // A different browser profile can recover a project checkpoint without access to localStorage.
  await note.fill('Recover from project backup')
  await expect(page.locator('.editor-save-status')).toContainText('已备份到工程')
  const otherContext = await browser.newContext()
  const otherPage = await otherContext.newPage()
  await otherPage.goto(server.url)
  await otherPage.getByRole('button', { name: /^工程草稿/ }).click()
  let resumeRecovery
  let recoveryStarted
  const recoveryHeld = new Promise((resolve) => {
    resumeRecovery = resolve
  })
  const recoveryLoading = new Promise((resolve) => {
    recoveryStarted = resolve
  })
  await otherPage.route('**/api/drafts/*', async (route) => {
    const response = await route.fetch()
    recoveryStarted()
    await recoveryHeld
    await route.fulfill({ response })
  })
  await otherPage.locator('.editor-recovery-item').first().click()
  await recoveryLoading
  assert.equal(await otherPage.locator('.editor-workspace').evaluate((element) => element.inert), true)
  resumeRecovery()
  await expect(otherPage.getByRole('textbox', { name: '备注', exact: true })).toHaveValue('Recover from project backup')
  await otherContext.close()
  assert.deepEqual(errors, [])
  console.log(
    'Editor compatibility passed: manual save, project draft backup, field merge, conflicts, focus/selection, added pages, refresh recovery, source-fetch race and legacy draft recovery.'
  )
} catch (error) {
  console.error('Browser errors:', errors)
  for (const context of browser.contexts())
    for (const page of context.pages()) console.error((await page.locator('body').innerText()).slice(0, 3000))
  throw error
} finally {
  await browser.close()
  await server.close()
  assert.equal(dirname(resolve(cwd)), resolve(tmpdir()))
  assert.ok(basename(cwd).startsWith('cake-editor-merge-'))
  await rm(cwd, { recursive: true, force: true })
}
