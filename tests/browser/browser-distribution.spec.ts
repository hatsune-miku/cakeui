import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { expect, test } from '@playwright/test'

test('classic external script works from a local HTML file with no npm, import map, or additional runtime requests', async ({
  page,
}) => {
  const failures: string[] = []
  const requests: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  await page.route('https://vanillacake.cn/cakeui-dist/*', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!
    requests.push(name)
    return route.fulfill({
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      contentType: name.endsWith('.css') ? 'text/css' : 'application/javascript',
      body: readFileSync(resolve('dist/browser', name)),
    })
  })
  const folder = mkdtempSync(resolve('.cache/browser-example-'))
  const html = resolve(folder, 'index.html')
  writeFileSync(html, readFileSync('public/browser.html'))
  await page.goto(pathToFileURL(html).href)
  await page.getByRole('button', { name: '计数 0', exact: true }).click()
  await expect(page.getByRole('button', { name: '计数 1', exact: true })).toBeVisible()
  const deck = page.getByRole('region', { name: 'Script 引用示例', exact: true })
  await deck.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { name: '复用相同 API' })).toBeVisible()
  await expect(deck.locator('.cake-slide-deck-page[data-active="true"] .cake-slide-title')).not.toHaveCSS(
    'font-size',
    '16px'
  )
  expect(await page.evaluate(() => Object.keys(window.CakeUI.presentation).length)).toBe(15)
  expect(await page.evaluate(() => typeof window.CakeUI.React.useState)).toBe('function')
  expect(requests.sort()).toEqual(['cakeui.css', 'cakeui.min.js'])
  expect(failures).toEqual([])
})

test('the documented plain HTML example renders against the built browser distribution', async ({ page }) => {
  const documentation = readFileSync('docs/ai.md', 'utf8')
  const html = documentation.match(/^```html example=browser-url\r?\n([\s\S]*?)^```/m)?.[1]
  expect(html).toBeTruthy()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('https://vanillacake.cn/cakeui-dist/*', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!
    return route.fulfill({
      status: 200,
      contentType: name.endsWith('.css') ? 'text/css' : 'application/javascript',
      body: readFileSync(resolve('dist/browser', name)),
    })
  })
  await page.setContent(html!)
  await expect(page.getByRole('heading', { name: '本周进展' })).toBeVisible()
  await expect(page.getByRole('region', { name: '项目汇报', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
