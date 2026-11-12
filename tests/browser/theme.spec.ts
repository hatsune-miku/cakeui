import { expect, test } from '@playwright/test'

import { themeContrast } from '../../src/theme'

test('preset and custom state colors match their foregrounds in the actual browser', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/tests/browser/fixtures/theme/')
  const primary = page.getByTestId('primary')
  const variants = [
    'blue',
    'pink',
    'gold',
    'dousha',
    'dousha-classic',
    'grape',
    '#000000',
    '#ffffff',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#fefeff',
  ]
  for (const variant of variants)
    for (const mode of ['light', 'dark']) {
      const backgrounds = new Map<string, string>()
      for (const foreground of ['auto', 'light', 'dark']) {
        await page.getByLabel('Preset', { exact: true }).selectOption(variant.startsWith('#') ? 'custom' : variant)
        if (variant.startsWith('#')) await page.getByLabel('Accent source').fill(variant)
        await page.getByLabel('Mode', { exact: true }).selectOption(mode)
        await page.getByLabel('Foreground', { exact: true }).selectOption(foreground)
        const legacy = ['blue', 'pink', 'gold'].includes(variant)
        async function check(name: string, locator = primary) {
          const colors = await locator.evaluate((element) => {
            const css = getComputedStyle(element)
            return [css.color, css.backgroundColor]
          })
          if (foreground === 'auto') backgrounds.set(name, colors[1])
          else expect(colors[1], `${variant}/${mode}/${foreground}/${name} background`).toBe(backgrounds.get(name))
          if (foreground === 'auto' && !legacy)
            expect(
              themeContrast(colors[0], colors[1]),
              `${variant}/${mode}/${foreground}/${name}`
            ).toBeGreaterThanOrEqual(4.5)
        }
        // Disable animation through the user's reduced-motion preference, not a test-only CSS override.
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.getByLabel('Preset', { exact: true }).hover()
        await check('normal')
        await primary.hover()
        await check('hover')
        await page.mouse.down()
        await check('active')
        await page.mouse.up()
        await check('selected', page.getByRole('tab', { name: 'First', exact: true }))
        if (!legacy) await check('disabled', page.getByTestId('disabled'))
        await check('inverted surface', page.getByTestId('inverted-panel'))
        await check('inverted accent surface', page.getByTestId('inverted-accent-panel'))
        for (const choice of [
          page.getByRole('checkbox', { name: 'Check', exact: true }),
          page.getByRole('radio', { name: 'Radio', exact: true }),
        ]) {
          await expect(choice).toHaveCSS('appearance', 'none')
          await check('choice mark', choice)
        }
      }
    }
  await expect(page.getByTestId('nested')).toHaveAttribute('data-theme', 'blue')
})

test('focus has one managed indicator, dialogs are 32px, and forced colors retain a visible indicator', async ({
  page,
}) => {
  await page.goto('/tests/browser/fixtures/theme/')
  await page.getByRole('button', { name: 'Rename', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Rename document' })
  const input = page.getByRole('textbox', { name: 'Document name' })
  await expect(input).toBeFocused()
  await expect(input).toHaveCSS('outline-style', 'none')
  await expect(input).toHaveCSS('outline-offset', '0px')
  expect(await input.evaluate((element) => (getComputedStyle(element).boxShadow.match(/inset/g) ?? []).length)).toBe(1)
  await expect(dialog).toHaveCSS('border-radius', '32px')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Rename', exact: true })).toBeFocused()
  for (const name of ['Name', 'Description', 'Choice', 'Searchable choice']) {
    const control = page.getByRole(name.includes('choice') || name === 'Choice' ? 'combobox' : 'textbox', {
      name,
      exact: true,
    })
    await control.focus()
    await expect(control).toHaveCSS('outline-style', 'none')
  }
  await page.getByTestId('primary').focus()
  await expect(page.getByTestId('primary')).toHaveCSS('outline-style', 'none')
  await expect(page.getByTestId('primary')).toHaveCSS('box-shadow', /inset/)
  await page.getByLabel('Preset', { exact: true }).selectOption('grape')
  await page.emulateMedia({ forcedColors: 'active' })
  await page.getByRole('textbox', { name: 'Name', exact: true }).focus()
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveCSS('outline-width', '2px')
  await expect(page.getByRole('checkbox', { name: 'Check', exact: true })).toHaveCSS('appearance', 'auto')
})

test('theme modal restores previews, scopes, keyboard focus, and only persists Apply', async ({ page }) => {
  await page.goto('/tests/browser/fixtures/theme/')
  const entry = page.getByRole('button', { name: 'Theme', exact: true })
  await entry.click()
  const dialog = page.getByRole('dialog', { name: 'Theme settings' })
  await expect(dialog.getByRole('radio', { name: '蓝', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('scope')).toHaveAttribute('data-theme', 'pink')
  await expect(page.getByTestId('nested')).toHaveAttribute('data-theme', 'blue')
  await page.keyboard.press('Escape')
  await expect(entry).toBeFocused()
  await expect(page.getByTestId('scope')).toHaveAttribute('data-theme', 'blue')
  expect(await page.evaluate(() => localStorage.getItem('cake-theme-fixture'))).toBeNull()
  await entry.click()
  await dialog.getByRole('radio', { name: 'Custom' }).check()
  await dialog.getByRole('textbox', { name: 'HEX or RGB' }).fill('rgb(24, 60, 120)')
  await dialog.getByRole('radio', { name: 'Dark', exact: true }).check()
  await dialog.getByRole('radio', { name: 'Light text', exact: true }).check()
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByTestId('attempts')).toHaveText('1')
  await expect(entry).toBeFocused()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cake-theme-fixture')!))
  expect(saved.customColor).toBe('#183c78')
  await entry.click()
  await dialog.getByRole('button', { name: 'Reset this scheme' }).click()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).last().click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cake-theme-fixture')!))).toEqual(saved)
  await expect(page.getByTestId('scope')).toHaveAttribute('data-mode', 'dark')
  await expect(page.getByTestId('scope')).toHaveCSS('--business-spacing', '19px')
  await page.reload()
  await expect(page.getByTestId('scope')).toHaveAttribute('data-theme', 'custom')
})

test('failed save retains applied preview, system changes update colors, and narrow dialogs scroll', async ({
  page,
}) => {
  await page.goto('/tests/browser/fixtures/theme/')
  await page.getByRole('checkbox', { name: 'Fail saving' }).check()
  await page.getByRole('button', { name: 'Theme', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Theme settings' })
  await dialog.getByRole('radio', { name: '绿豆沙' }).check()
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByTestId('scope')).toHaveAttribute('data-theme', 'dousha-classic')
  await expect(page.getByTestId('error')).toHaveText('save')
  await page.getByLabel('Mode', { exact: true }).selectOption('system')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.getByTestId('scope')).toHaveCSS('color-scheme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.getByTestId('scope')).toHaveCSS('color-scheme', 'light')
  await page.setViewportSize({ width: 360, height: 480 })
  await page.getByRole('button', { name: 'Theme', exact: true }).click()
  await dialog.getByRole('radio', { name: 'Custom' }).check()
  const dimensions = await dialog.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }))
  expect(dimensions.width).toBeLessThanOrEqual(336)
  expect(dimensions.height).toBeLessThanOrEqual(432)
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  const body = await dialog.locator('.cake-dialog-body').evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }))
  expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
  expect(dimensions.scrollHeight).toBe(dimensions.clientHeight)
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(dialog).not.toBeVisible()
})

test('theme choices accept a single pointer click without moving the dialog', async ({ page }) => {
  for (const viewport of [
    { width: 1060, height: 770 },
    { width: 1060, height: 580 },
    { width: 360, height: 480 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/tests/browser/fixtures/theme/')
    await page.getByRole('button', { name: 'Theme', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Theme settings' })
    const original = await dialog.boundingBox()
    for (const name of ['葡萄', 'Custom', 'Dark', 'Light text', 'Dark text', '粉']) {
      const target = dialog.getByRole('radio', { name, exact: true })
      await target.scrollIntoViewIfNeeded()
      const bounds = (await target.boundingBox())!
      await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      await expect(target).toBeChecked()
      expect(await dialog.boundingBox()).toEqual(original)
    }
    await dialog.evaluate((element) => element.focus())
    await expect(dialog).toHaveCSS('outline-style', 'none')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).last().click()
  }
})
