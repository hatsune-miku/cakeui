import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('standalone slides keep their ratio, typography, and focus-local navigation without base CSS', async ({
  page,
}) => {
  await page.goto('/slides.html')
  const deck = page.getByRole('region', { name: 'HTML 幻灯片示例' })
  await expect(deck.getByRole('group')).toHaveCount(1)
  const dimensions = await deck
    .locator('.cake-slide')
    .first()
    .evaluate((slide) => {
      const rect = slide.getBoundingClientRect()
      const heading = slide.querySelector('.cake-slide-title')!
      return {
        ratio: rect.width / rect.height,
        typeRatio: parseFloat(getComputedStyle(heading).fontSize) / rect.width,
        select: getComputedStyle(document.body).userSelect,
      }
    })
  expect(dimensions.ratio).toBeCloseTo(16 / 9, 2)
  expect(dimensions.typeRatio).toBeCloseTo(0.05625, 4)
  expect(dimensions.select).not.toBe('none')
  await page.locator('body').press('ArrowRight')
  await expect(deck.getByRole('group')).toHaveAccessibleName(/1 \/ 6/)
  await deck.focus()
  await page.keyboard.press('ArrowRight')
  await expect(deck.getByRole('group')).toHaveAccessibleName(/2 \/ 6/)
  await page.keyboard.press('End')
  await expect(deck.getByRole('group')).toHaveAccessibleName(/6 \/ 6/)
  await page.keyboard.press('Home')
  await page.getByRole('button', { name: '4:3', exact: true }).click()
  const box = await deck.locator('.cake-slide').first().boundingBox()
  expect(box!.width / box!.height).toBeCloseTo(4 / 3, 2)
})

test('all example layouts fit the canvas and pass accessibility checks in six palettes', async ({ page }) => {
  for (const theme of ['blue', 'pink', 'gold']) {
    for (const mode of ['light', 'dark']) {
      await page.goto(`/slides.html?theme=${theme}&mode=${mode}`)
      const deck = page.getByRole('region', { name: 'HTML 幻灯片示例' })
      for (let index = 0; index < 6; index++) {
        const overflow = await deck
          .locator('.cake-slide-deck-page[data-active="true"] > .cake-slide > .cake-slide-content')
          .evaluate((element) => ({
            width: element.scrollWidth - element.clientWidth,
            height: element.scrollHeight - element.clientHeight,
          }))
        expect(overflow.width, `${theme}/${mode} slide ${index + 1} horizontal overflow`).toBeLessThanOrEqual(1)
        expect(overflow.height, `${theme}/${mode} slide ${index + 1} vertical overflow`).toBeLessThanOrEqual(1)
        if (index < 5) await deck.getByRole('button', { name: '下一页', exact: true }).click()
      }
      await page.getByRole('button', { name: '连续阅读', exact: true }).click()
      await expect(page.getByRole('region').getByRole('group')).toHaveCount(6)
      const overflow = await page.locator('.cake-slide-content').evaluateAll((elements) =>
        elements.map((element) => ({
          width: element.scrollWidth - element.clientWidth,
          height: element.scrollHeight - element.clientHeight,
        }))
      )
      expect(
        overflow.every((value) => value.width <= 1 && value.height <= 1),
        JSON.stringify(overflow)
      ).toBe(true)
      const result = await new AxeBuilder({ page }).include('.cake-slide-deck').analyze()
      expect(result.violations).toEqual([])
    }
  }
})

test('editable content, nested decks, overflowing pages, focus recovery and per-slide fullscreen ratios', async ({
  page,
}) => {
  await page.goto('/tests/browser/fixtures/presentation/')
  const deck = page.getByRole('region', { name: 'Fixture', exact: true })
  const notes = page.getByRole('textbox', { name: 'Notes' })
  await expect(page.getByText('Inner two left')).toBeVisible()
  await notes.fill('Keep my edits')
  await notes.press('ArrowRight')
  await expect(notes).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Last field' })).toHaveCount(0)
  await page.getByRole('button', { name: 'External next' }).evaluate((button: HTMLButtonElement) => button.click())
  await expect(deck).toBeFocused()
  const body = deck.locator(
    ':scope > .cake-slide-deck-stage > .cake-slide-deck-page[data-active="true"] > .cake-slide > .cake-slide-content'
  )
  expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(page.getByRole('textbox', { name: 'Last field' })).toBeInViewport()
  await deck.getByRole('button', { name: 'Enter fullscreen', exact: true }).click()
  const box = await body.locator('..').boundingBox()
  expect(box!.width / box!.height).toBeCloseTo(4 / 3, 2)
  expect(box!.y + box!.height).toBeLessThanOrEqual(1050)
  await page.evaluate(() => document.exitFullscreen())
  await page.getByRole('button', { name: 'Toggle document' }).click()
  expect(await body.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1)
  await expect(notes).toHaveValue('Keep my edits')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Toggle inner document' }).click()
  const inner = page.getByRole('region', { name: 'Inner', exact: true })
  await inner.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText('Inner one')).toBeHidden()
  expect(
    await inner
      .locator('.cake-slide-columns')
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
  ).toBe(2)
})

test('narrow document view reflows columns and remains readable without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/slides.html')
  await page.getByRole('button', { name: '连续阅读', exact: true }).click()
  const bodyText = page.locator('.cake-slide-text[data-size="body"]').first()
  await expect(bodyText).toHaveCSS('font-size', '17px')
  const layout = await page
    .locator('.cake-slide-columns')
    .first()
    .evaluate((element) => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      overflow: document.documentElement.scrollWidth - innerWidth,
      pages: [...document.querySelectorAll('.cake-slide')].map((slide) => {
        const body = slide.querySelector('.cake-slide-content')!
        return { page: slide.getBoundingClientRect().height, content: body.getBoundingClientRect().height }
      }),
    }))
  expect(layout.columns).toBe(1)
  expect(layout.overflow).toBeLessThanOrEqual(1)
  for (const heights of layout.pages) expect(heights.page).toBeGreaterThanOrEqual(heights.content - 1)
  await page.screenshot({ path: '.cache/presentation-mobile.png', fullPage: true })
})

test('fullscreen fits the viewport and native fullscreen exit restores controls', async ({ page }) => {
  await page.goto('/slides.html')
  const enter = page.getByRole('button', { name: '全屏演示', exact: true })
  await expect(enter).toBeEnabled()
  await enter.click()
  await expect(page.getByRole('button', { name: '退出全屏', exact: true })).toBeVisible()
  const bounds = await page.locator('.cake-slide-deck-page[data-active="true"] .cake-slide').boundingBox()
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1050)
  expect(bounds!.width / bounds!.height).toBeCloseTo(16 / 9, 2)
  // Chromium automation does not always route Escape to browser chrome; use the native exit API.
  await page.evaluate(() => document.exitFullscreen())
  await expect(enter).toBeVisible()
})

test('printing exposes every slide and removes controls; reduced motion removes button transitions', async ({
  page,
}) => {
  await page.goto('/slides.html')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.cake-slide-deck-button').first()).toHaveCSS('transition-duration', '0s')
  await page.emulateMedia({ media: 'print' })
  for (const slide of await page.locator('.cake-slide-deck-page').all()) await expect(slide).toBeVisible()
  await expect(page.locator('.cake-slide-deck-controls')).toBeHidden()
  await expect(page.locator('.presentation-demo-toolbar')).toBeHidden()
  await expect(page.locator('.cake-slide-deck-page').first()).toHaveCSS('break-after', 'page')
  await expect(page.locator('.cake-slide-deck-page').last()).toHaveCSS('break-after', 'auto')
  await page.pdf({ path: '.cache/presentation.pdf', preferCSSPageSize: true, printBackground: true })
})

test('gallery provides presentation examples and theme selection', async ({ page }) => {
  await page.goto('/?page=presentation')
  await expect(page.getByRole('heading', { name: '幻灯片', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '粉', exact: true }).click()
  await expect(page.getByRole('region', { name: 'HTML 幻灯片示例' })).toHaveAttribute('data-theme', 'pink')
  await page.getByRole('button', { name: '蓝', exact: true }).click()
  await page.screenshot({ path: '.cache/presentation-gallery.png', fullPage: true })
  await page.getByRole('button', { name: '02 分栏与重点' }).click()
  await page.screenshot({ path: '.cache/presentation-columns.png', fullPage: true })
})
