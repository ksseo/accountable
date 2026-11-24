// The screens with about 1,000 of each record (SC 9, PERF-1, PERF-2, TEST-5):
// each shows its content, not its loading shapes, within 1 second of being
// opened, and a table updates within 200 ms of a search or a click on a heading.
import type { Page } from '@playwright/test'
import { expect, resetData, test } from '../support/fixtures'
import { API_URL, loadBulkData } from '../support/servers'

test.describe.configure({ mode: 'serial' })
test.beforeAll(() => loadBulkData())
test.afterAll(() => resetData())

const SCREENS = [
  { label: '대시보드', ready: '[aria-label="진행 중 파이프라인"]' },
  { label: '거래처', ready: 'table tbody tr' },
  { label: '연락처', ready: 'table tbody tr' },
  { label: '영업 기회', ready: 'table tbody tr' },
  { label: '파이프라인', ready: '[data-card-id]' },
]

/** Clicks the nav link in the page and times it until `ready` is drawn and
 * nothing is still loading. */
function openFromNav(page: Page, label: string, ready: string): Promise<number> {
  return page.evaluate(
    ({ label, ready }) =>
      new Promise<number>((resolve) => {
        const link = [...document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="주 메뉴"] a')].find(
          (anchor) => anchor.textContent === label,
        )!
        const started = performance.now()
        link.click()
        const check = () => {
          // The new page's own heading, so the last page's rows don't count.
          const arrived = document.querySelector('h1')?.textContent === label
          const loading = document.querySelector(
            '[role="status"][aria-label="불러오는 중"], [aria-busy="true"]',
          )
          if (arrived && document.querySelector(ready) && !loading) resolve(performance.now() - started)
          else requestAnimationFrame(check)
        }
        requestAnimationFrame(check)
      }),
    { label, ready },
  )
}

/** Runs `act` and times it until the table's rows first change. */
async function timeTableChange(
  page: Page,
  act: () => Promise<void>,
  event: 'input' | 'click',
): Promise<number> {
  await page.evaluate((event) => {
    const state = window as unknown as { __started?: number; __changed?: number }
    delete state.__started
    delete state.__changed
    document.addEventListener(event, () => (state.__started ??= performance.now()), {
      capture: true,
      once: true,
    })
    const body = document.querySelector('table tbody')!
    const observer = new MutationObserver(() => {
      state.__changed ??= performance.now()
      observer.disconnect()
    })
    observer.observe(body, { childList: true, subtree: true, characterData: true })
  }, event)
  await act()
  await page.waitForFunction(() => (window as unknown as { __changed?: number }).__changed !== undefined)
  return page.evaluate(() => {
    const state = window as unknown as { __started: number; __changed: number }
    return state.__changed - state.__started
  })
}

test('each screen shows its content within 1 second of being opened', async ({ page }) => {
  const counts = (await (await fetch(`${API_URL}/api/organizations`)).json()) as unknown[]
  expect(counts.length).toBeGreaterThanOrEqual(1000)

  // The first visit loads the app's code; the timed visits open each screen from the nav.
  await page.goto('/organizations')
  await expect(page.locator('table tbody tr').first()).toBeVisible()
  const times: string[] = []
  for (const screen of SCREENS) {
    const ms = await openFromNav(page, screen.label, screen.ready)
    times.push(`${screen.label} ${ms.toFixed(0)} ms`)
    expect(ms, screen.label).toBeLessThan(1000)
  }
  console.log(`screens opened from the nav: ${times.join(', ')}`)
})

test('a table updates within 200 ms of a search or a click on a heading', async ({ page }) => {
  const contacts = (await (await fetch(`${API_URL}/api/contacts`)).json()) as { name: string }[]
  const sought = contacts[contacts.length - 1].name
  await page.goto('/contacts')
  await expect(page.locator('table tbody tr')).toHaveCount(50)

  const box = page.getByRole('searchbox', { name: '연락처 검색' })
  const searchMs = await timeTableChange(page, () => box.fill(sought), 'input')
  await expect(page.locator('table tbody tr').filter({ hasText: sought }).first()).toBeVisible()
  await box.fill('')
  await expect(page.locator('table tbody tr')).toHaveCount(50)

  const sortMs = await timeTableChange(
    page,
    () => page.getByRole('columnheader', { name: /이름/ }).getByRole('button').click(),
    'click',
  )
  console.log(`contacts (${contacts.length}): search ${searchMs.toFixed(0)} ms, sort ${sortMs.toFixed(0)} ms`)
  expect(searchMs).toBeLessThan(200)
  expect(sortMs).toBeLessThan(200)
})
