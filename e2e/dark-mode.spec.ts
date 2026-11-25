// Dark mode: the toggle on every page, the choice that's kept, and the dark
// colors of charts, dialogs, menus and messages (SC 11, UI-9, LOOK-5, LOOK-6,
// LOOK-8, LOOK-11, A11Y-1).
import type { Locator, Page } from '@playwright/test'
import { dragTo } from './crm/board'
import { dialog } from './crm/helpers'
import { apiGet, expect, resetData, test } from './support/fixtures'
import { restartBackend } from './support/servers'

const LIGHT_PAGE = 'rgb(240, 244, 245)'
const DARK_PAGE = 'rgb(4, 35, 46)'
const BLACK = 'rgb(0, 0, 0)'
const WHITE = 'rgb(255, 255, 255)'
/** Dialogs and a card being dragged (LOOK-11). */
const RAISED = 'rgb(12, 49, 62)'
/** Menus, lists and the calendar (LOOK-11). */
const POPOVER = 'rgb(21, 66, 82)'
const SEA_MIST = 'rgb(205, 216, 219)'
const MIDNIGHT = 'rgb(7, 59, 76)'
const DEEP_RASPBERRY = 'rgb(194, 36, 76)'
const SEA_GREEN_INK = 'rgb(92, 229, 192)'
const MUTED = 'rgb(157, 177, 186)'

const toggle = (page: Page) => page.getByRole('banner').getByRole('button', { name: '다크 모드' })
const panel = (page: Page, title: string) =>
  page.locator('section', { has: page.getByRole('heading', { name: title, exact: true }) })

async function expectMode(page: Page, mode: 'light' | 'dark') {
  await expect(toggle(page)).toHaveAttribute('aria-pressed', String(mode === 'dark'))
  await expect(page.locator('body')).toHaveCSS('background-color', mode === 'dark' ? DARK_PAGE : LIGHT_PAGE)
}

/** The background an element is drawn on: its own, or the nearest one behind it. */
async function expectDrawnOn(element: Locator, color: string) {
  await expect
    .poll(() =>
      element.evaluate((start) => {
        let at: Element | null = start
        while (at && getComputedStyle(at).backgroundColor === 'rgba(0, 0, 0, 0)') at = at.parentElement
        return at && getComputedStyle(at).backgroundColor
      }),
    )
    .toBe(color)
}

test.beforeAll(() => resetData())

test.describe('the choice', () => {
  // A record that isn't there, and the backend while it restarts.
  test.use({ allowConsole: [/status of (404|503)/] })

  test('is light until dark mode is turned on, even when the device prefers dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expectMode(page, 'light')
  })

  test('is on every page, and a reload keeps it', async ({ page }) => {
    const [organization] = await apiGet<{ id: number }[]>('/api/organizations')
    const pages = [
      '/',
      '/organizations',
      '/contacts',
      '/deals',
      '/pipeline',
      `/organizations/${organization.id}`,
      '/organizations/999999',
      '/nowhere',
    ]
    for (const path of pages) {
      await page.goto(path)
      await expectMode(page, 'light')
      await toggle(page).click()
      await expectMode(page, 'dark')
      await page.reload()
      await expectMode(page, 'dark')
      await toggle(page).click()
      await expectMode(page, 'light')
    }
    await page.reload()
    await expectMode(page, 'light')
  })

  test('is kept after the seed command and after the backend restarts', async ({ page }) => {
    await page.goto('/')
    await toggle(page).click()
    resetData()
    await page.reload()
    await expectMode(page, 'dark')

    await restartBackend()
    await page.reload()
    await expect(page.getByRole('region', { name: '진행 중 파이프라인' })).toBeVisible()
    await expectMode(page, 'dark')
  })

  test('reaches a tab that is already open when it is next loaded', async ({ page, context }) => {
    const other = await context.newPage()
    await other.goto('/contacts')
    await page.goto('/')
    await toggle(page).click()
    await expectMode(page, 'dark')
    await expectMode(other, 'light')
    await other.reload()
    await expectMode(other, 'dark')
  })

  test('still switches when the browser will not keep it', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Access is denied for this document.', 'SecurityError')
        },
      })
    })
    await page.goto('/')
    await toggle(page).click()
    await expectMode(page, 'dark')
    await toggle(page).click()
    await expectMode(page, 'light')
    await toggle(page).click()
    await page.reload()
    await expectMode(page, 'light')
  })

  test('is made by keyboard with Tab and Space', async ({ page }) => {
    await page.goto('/')
    await expect(toggle(page)).toBeVisible()
    for (let presses = 0; presses < 10; presses++) {
      await page.keyboard.press('Tab')
      if (await toggle(page).evaluate((element) => element === document.activeElement)) break
    }
    await expect(toggle(page)).toBeFocused()
    await page.keyboard.press('Space')
    await expectMode(page, 'dark')
    await expect(toggle(page)).toBeFocused()
  })
})

test('switching leaves typed text, the address and the scroll as they are, with no message', async ({
  page,
}) => {
  const [contact] = await apiGet<{ id: number }[]>('/api/contacts')
  const form = page.getByRole('form', { name: '활동 기록' }).getByRole('textbox', { name: '내용 (필수)' })
  const search = page.getByRole('searchbox', { name: '연락처 검색' })

  for (const { path, field, text } of [
    { path: `/contacts/${contact.id}`, field: form, text: '저장하지 않은 메모' },
    { path: '/contacts?status=customer', field: search, text: '김' },
  ]) {
    // Short enough that both pages scroll.
    await page.setViewportSize({ width: 1440, height: 400 })
    await page.goto(path)
    await field.fill(text)
    // As far as it goes with the top bar still in view.
    await page.evaluate(() => window.scrollTo(0, 20))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(20)
    const address = page.url()

    for (const mode of ['dark', 'light'] as const) {
      await toggle(page).click()
      await expectMode(page, mode)
      await expect(field).toHaveValue(text)
      expect(page.url()).toBe(address)
      expect(await page.evaluate(() => window.scrollY)).toBe(20)
      await expect(page.getByRole('status')).toBeEmpty()
    }
  }
})

test('a chart that is already on screen changes with the mode, and so does its tooltip', async ({ page }) => {
  await page.goto('/')
  const line = panel(page, '월별 수주 금액')
  const bars = panel(page, '월별 수주·실주 건수')
  await expect(line.locator('path.recharts-area-curve')).toBeVisible()
  await toggle(page).click()

  await expect(line.locator('path.recharts-area-curve')).toHaveCSS('stroke', SEA_GREEN_INK)
  await expect(line.locator('circle').first()).toHaveCSS('fill', BLACK)
  await expect(line.getByText('$40K')).toHaveCSS('fill', MUTED)
  await expect(line.locator('.recharts-cartesian-grid line').first()).toHaveCSS(
    'stroke',
    'rgba(205, 216, 219, 0.2)',
  )
  await expect(bars.locator('.recharts-label-list text').first()).toHaveCSS('fill', SEA_MIST)
  await expectDrawnOn(line, BLACK)

  for (const [chart, text] of [
    [line, /^수주 \$/],
    [bars, /^수주 \d+건 · 실주 \d+건$/],
  ] as const) {
    await chart.locator('svg[role="application"]').focus()
    const tooltip = chart.locator('.recharts-tooltip-wrapper').getByText(text)
    await expectDrawnOn(tooltip, SEA_MIST)
    await expect(tooltip).toHaveCSS('color', MIDNIGHT)
  }

  // The stages: Won is Sea Mist, and the others are what they are in light mode (LOOK-5).
  const funnel = panel(page, '영업 퍼널')
  for (const [stage, fill, on] of [
    ['new', 'rgb(6, 214, 160)', MIDNIGHT],
    ['negotiation', 'rgb(13, 113, 148)', WHITE],
    ['won', SEA_MIST, MIDNIGHT],
  ]) {
    await expect(funnel.locator(`[data-stage="${stage}"] path`)).toHaveCSS('fill', fill)
    await expect(funnel.locator(`[data-stage="${stage}"] text`).first()).toHaveCSS('fill', on)
  }
})

test.describe('in dark mode', () => {
  test.use({ mode: 'dark', allowConsole: [/status of 500/] })

  test('a page has the dark background before the app has run', async ({ page }) => {
    let release = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/src/main.tsx*', async (route) => {
      await held
      await route.continue()
    })
    await page.goto('/', { waitUntil: 'commit' })
    await expect(page.locator('body')).toHaveCSS('background-color', DARK_PAGE)
    await expect(page.locator('html')).toHaveCSS('background-color', DARK_PAGE)
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
    await expect(page.locator('#root')).toBeEmpty()
    release()
    await expectMode(page, 'dark')
  })

  test('a dialog, its list and its calendar are lighter than the page', async ({ page }) => {
    await page.goto('/deals')
    await page.getByRole('banner').getByRole('button', { name: '영업 기회 추가' }).click()
    const form = dialog(page, '영업 기회 추가')
    await expectDrawnOn(form, RAISED)
    await expectDrawnOn(form.getByRole('textbox', { name: '이름 (필수)' }), BLACK)

    await form.getByRole('button', { name: /단계/ }).click()
    await expectDrawnOn(page.getByRole('listbox'), POPOVER)
    await page.keyboard.press('Escape')

    await form.getByRole('combobox', { name: '거래처' }).click()
    await expectDrawnOn(page.getByRole('listbox'), POPOVER)
    await page.keyboard.press('Escape')

    await form.getByRole('button', { name: '마감일 달력 열기' }).click()
    const calendar = page.getByRole('dialog', { name: '마감일 선택' })
    await expectDrawnOn(calendar, POPOVER)
    await calendar.getByRole('gridcell').getByRole('button').nth(14).click()
    await form.getByRole('button', { name: '마감일 달력 열기' }).click()
    const chosen = calendar.locator('[role="gridcell"][aria-selected="true"] [role="button"]')
    await expectDrawnOn(chosen, SEA_MIST)
    await expect(chosen).toHaveCSS('color', MIDNIGHT)
  })

  test('a menu and a card being dragged are lighter than the page', async ({ page }) => {
    await page.goto('/pipeline')
    const board = page.getByRole('region', { name: '파이프라인 보드' })
    const card = board.locator('[data-card-id]').first()
    await expectDrawnOn(card, BLACK)

    await card.getByRole('button', { name: /메뉴$/ }).click()
    await expectDrawnOn(page.getByRole('menu'), POPOVER)
    await page.keyboard.press('Escape')

    const box = (await card.boundingBox())!
    await page.mouse.move(box.x + 40, box.y + 15)
    await page.mouse.down()
    await page.mouse.move(box.x + 60, box.y + 40, { steps: 5 })
    // The copy under the pointer, which is hidden from screen readers.
    await expectDrawnOn(page.locator('article[aria-hidden="true"]'), RAISED)
    await page.keyboard.press('Escape')
    await page.mouse.up()
  })

  test('a message is Sea Mist, and one that failed is deep Raspberry', async ({ page }) => {
    await page.goto('/pipeline')
    const lanes = ['new', 'qualified'].map((stage) =>
      page.locator(`section[aria-labelledby="lane-${stage}"] [data-card-id]`).first(),
    )
    await dragTo(page, lanes[0], lanes[1])
    const saved = page.getByRole('status').getByText('단계로 옮겼어요')
    await expectDrawnOn(saved, SEA_MIST)
    await expect(saved).toHaveCSS('color', MIDNIGHT)

    await page.route('**/api/deals/*/move', (route) => route.fulfill({ status: 500, body: '{}' }))
    await dragTo(page, lanes[0], lanes[1])
    const failed = page.getByRole('status').getByText('이동하지 못했어요')
    await expectDrawnOn(failed, DEEP_RASPBERRY)
    await expect(failed).toHaveCSS('color', WHITE)
  })
})
