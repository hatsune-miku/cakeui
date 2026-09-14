import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const reference = readFileSync('public/llms-full.txt', 'utf8')

test('gallery documents are discoverable, directly addressable and readable on narrow screens', async ({
  page,
  request,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'AI 技术文档', exact: true }).click()
  await expect(page).toHaveURL(/\?page=docs$/)
  const content = page.getByLabel('CakeUI 完整技术文档', { exact: true })
  await expect(content).toHaveText(reference)
  await expect(content).toHaveCSS('user-select', 'text')
  await expect(page.getByRole('link', { name: '打开完整纯文本' })).toHaveAttribute('href', '/llms-full.txt')
  await expect(page.getByRole('link', { name: '简短索引 llms.txt' })).toHaveAttribute('href', '/llms.txt')
  await page.reload()
  await expect(content).toHaveText(reference)
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: 'test-results/ai-docs-desktop.png' })
  for (const name of ['llms.txt', 'llms-full.txt']) {
    const response = await request.get('/' + name)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('text/plain; charset=utf-8')
    expect(response.headers()['cache-control']).toBe('no-cache')
    expect(await response.body()).toEqual(readFileSync('public/' + name))
  }
  const missing = await request.get('/llms-missing.txt')
  expect(missing.status()).toBe(404)
  expect(await missing.text()).not.toContain('<html')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: '切换深色模式' }).click()
  await expect(content).toBeVisible()
  const dark = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(dark.violations).toEqual([])
  await page.screenshot({ path: 'test-results/ai-docs-mobile-dark.png' })
  await page.getByRole('textbox', { name: '搜索组件' }).fill('Button')
  await expect(page).not.toHaveURL(/page=docs/)
  await expect(page.locator('.demo-section')).toHaveCount(2)
})

test('plain reference needs no JavaScript and the gallery can recover from a failed document request', async ({
  browser,
  page,
  baseURL,
}) => {
  const reader = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const textPage = await reader.newPage()
  try {
    const response = await textPage.goto('/llms-full.txt')
    expect(response?.status()).toBe(200)
    expect(await textPage.locator('body').innerText()).toBe(reference)
  } finally {
    await reader.close()
  }
  let available = false
  await page.route('**/llms-full.txt', (route) =>
    route.fulfill({
      status: available ? 200 : 503,
      contentType: 'text/plain; charset=utf-8',
      body: available ? reference : 'Unavailable',
    })
  )
  await page.goto('/?page=docs')
  await expect(page.getByText('文档暂时无法加载。')).toBeVisible()
  available = true
  await page.getByRole('button', { name: '重新加载' }).click()
  await expect(page.getByLabel('CakeUI 完整技术文档', { exact: true })).toHaveText(reference)
})
