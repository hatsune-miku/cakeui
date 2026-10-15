import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('nested thumbnails shrink, disclose without selection, reveal external selection and preserve keyboard focus', async ({
  page,
}) => {
  await page.goto('/tests/browser/fixtures/slide-tree/')
  const tree = page.getByRole('navigation')
  const root = tree.getByRole('button', { name: 'Root preview Root', exact: true })
  const child = tree.getByRole('button', { name: 'Child preview Child', exact: true })
  const leaf = tree.getByRole('button', { name: 'Leaf preview Leaf', exact: true })
  const boxes = await tree.locator('.cake-slide-tree-thumbnail').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width }
    })
  )
  expect(boxes[0].width).toBeGreaterThan(boxes[1].width)
  expect(boxes[1].width).toBeGreaterThan(boxes[2].width)
  expect(boxes[0].x).toBeLessThan(boxes[1].x)
  expect(boxes[1].x).toBeLessThan(boxes[2].x)
  expect(boxes[2].y).toBeLessThan(boxes[3].y)
  await root.focus()
  await page.keyboard.press('ArrowRight')
  await expect(child).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(leaf).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(leaf).toBeHidden()
  await expect(root).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Select leaf externally' }).click()
  await expect(leaf).toBeVisible()
  await expect(leaf).toHaveAttribute('aria-current', 'page')
  await expect(leaf).toBeInViewport()
  expect((await new AxeBuilder({ page }).include('.cake-slide-tree').analyze()).violations).toEqual([])
  await page.emulateMedia({ media: 'print' })
  await expect(tree).toBeHidden()
})
