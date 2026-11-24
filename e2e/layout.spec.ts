// Widths: at 1280px and 1024px no screen scrolls sideways; at 1280px the six
// lanes fit, and at 1024px the board scrolls inside its own panel (APP-1, PIPE-7).
import type { Page } from '@playwright/test'
import { apiGet, expect, test } from './support/fixtures'

async function screens(): Promise<string[]> {
  const [organization] = await apiGet<{ id: number }[]>('/api/organizations')
  const [contact] = await apiGet<{ id: number }[]>('/api/contacts')
  const [deal] = await apiGet<{ id: number }[]>('/api/deals')
  return [
    '/',
    '/organizations',
    '/contacts',
    '/deals',
    '/pipeline',
    `/organizations/${organization.id}`,
    `/contacts/${contact.id}`,
    `/deals/${deal.id}`,
  ]
}

async function open(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1')).not.toHaveText(/^\s*$/)
}

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

for (const width of [1280, 1024]) {
  test(`at ${width}px no screen scrolls sideways`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const path of await screens()) {
      await open(page, path)
      expect(await pageOverflow(page), path).toBeLessThanOrEqual(0)
    }
  })
}

test('at 1280px the six lanes fit without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, '/pipeline')
  const board = page.getByRole('region', { name: '파이프라인 보드' })
  const overflow = await board.evaluate((element) => element.scrollWidth - element.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  for (const lane of ['신규', '적격', '제안', '협상', '수주', '실주']) {
    await expect(board.getByRole('heading', { level: 2, name: lane, exact: true })).toBeInViewport({
      ratio: 1,
    })
  }
})

test('at 1024px the board scrolls inside its panel and the page does not', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 })
  await open(page, '/pipeline')
  const board = page.getByRole('region', { name: '파이프라인 보드' })
  expect(await board.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
  const lost = board.getByRole('heading', { level: 2, name: '실주', exact: true })
  await expect(lost).not.toBeInViewport({ ratio: 1 })
  await board.evaluate((element) => element.scrollTo({ left: element.scrollWidth }))
  await expect(lost).toBeInViewport({ ratio: 1 })
})
