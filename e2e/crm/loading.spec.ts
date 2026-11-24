// A screen that can't be loaded says so and can be tried again, instead of
// showing its shape for good (UI-5).
import { expect, resetData, test } from '../support/fixtures'
import type { Page } from '@playwright/test'
import { dialog, tableRows } from './helpers'

// Chrome logs the failed calls.
test.use({ allowConsole: [/status of 500/] })

test.beforeAll(() => resetData())

const FAILED = '불러오지 못했어요'

const fail = (page: Page, call: string) =>
  page.route(call, (route) => route.fulfill({ status: 500, body: '{}' }))

const SCREENS = [
  {
    title: '대시보드',
    path: '/',
    call: '**/api/dashboard',
    loaded: (page: Page) => page.getByRole('region', { name: '진행 중 파이프라인' }),
  },
  {
    title: '거래처',
    path: '/organizations',
    call: '**/api/organizations',
    loaded: (page: Page) => tableRows(page, '거래처 목록').first(),
  },
  {
    title: '연락처',
    path: '/contacts',
    call: '**/api/contacts',
    loaded: (page: Page) => tableRows(page, '연락처 목록').first(),
  },
  {
    title: '영업 기회',
    path: '/deals',
    call: '**/api/deals',
    loaded: (page: Page) => tableRows(page, '영업 기회 목록').first(),
  },
  {
    title: '파이프라인',
    path: '/pipeline',
    call: '**/api/pipeline',
    loaded: (page: Page) => page.locator('[data-card-id]').first(),
  },
  {
    title: '파이프라인',
    path: '/pipeline',
    call: '**/api/meta',
    loaded: (page: Page) => page.locator('[data-card-id]').first(),
  },
]

for (const { title, path, call, loaded } of SCREENS) {
  test(`${title} says it could not be loaded when ${call.slice(3)} fails`, async ({ page }) => {
    await fail(page, call)
    await page.goto(path)
    const main = page.getByRole('main')
    await expect(main.getByText(FAILED)).toBeVisible()
    await expect(main.getByRole('heading', { level: 1, name: title })).toBeVisible()
    // A count that isn't known isn't shown as 0.
    await expect(main).not.toContainText('0')

    await page.unroute(call)
    await main.getByRole('button', { name: '다시 시도' }).click()
    await expect(loaded(page)).toBeVisible()
    await expect(main.getByText(FAILED)).toHaveCount(0)
  })
}

for (const { title, path, call } of [
  { title: '연락처 추가', path: '/contacts', call: '**/api/organizations' },
  { title: '영업 기회 추가', path: '/organizations', call: '**/api/contacts' },
]) {
  test(`${title} says it could not be loaded when ${call.slice(3)} fails`, async ({ page }) => {
    await fail(page, call)
    await page.goto(path)
    await page.getByRole('button', { name: title }).first().click()
    const form = dialog(page, title)
    await expect(form.getByText(FAILED)).toBeVisible()
    await page.unroute(call)
    await form.getByRole('button', { name: '다시 시도' }).click()
    await expect(form.getByRole('textbox', { name: '이름 (필수)' })).toBeVisible()
  })
}
