// The dashboard: figures that match the deals, figures that change after a
// deal is won or a follow-up is added or done, the links out, tooltips on
// focus and "표로 보기" (SC 6, DASH-1 to DASH-13, A11Y-6).
import type { Page } from '@playwright/test'
import { formatChartMonth, formatDateWithWeekday, formatMonthDay } from '../../frontend/src/lib/dates'
import { formatMoney } from '../../frontend/src/lib/money'
import { apiGet, expect, resetData, test, today } from '../support/fixtures'
import { tableRows } from './helpers'

type Stage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
type Deal = {
  id: number
  name: string
  stage: Stage
  value: number
  expected_revenue: number
  close_date: string | null
  is_late: boolean
}
type Figures = {
  open_value: number
  open_count: number
  won_this_month_value: number
  won_this_month_count: number
}

const OPEN: Stage[] = ['new', 'qualified', 'proposal', 'negotiation']
const LABELS: Record<Stage, string> = {
  new: '신규',
  qualified: '적격',
  proposal: '제안',
  negotiation: '협상',
  won: '수주',
  lost: '실주',
}
const sum = (deals: Deal[], field: 'value' | 'expected_revenue' = 'value') =>
  deals.reduce((total, deal) => total + deal[field], 0)

/** The 12 months the charts show, "YYYY-MM", oldest first, ending with today's. */
function last12Months(day: string): string[] {
  const [year, month] = day.split('-').map(Number)
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, month - 12 + index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

const addDays = (iso: string, days: number) => {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const hero = (page: Page) => page.getByRole('region', { name: '진행 중 파이프라인' })
const panel = (page: Page, title: string) =>
  page.locator('section', { has: page.getByRole('heading', { name: title, exact: true }) })
const toastText = (page: Page, text: string | RegExp) => page.getByRole('status').getByText(text)

test.beforeEach(() => resetData())

test('the figures, band and monthly total equal what the deals add up to', async ({ page }) => {
  const deals = await apiGet<Deal[]>('/api/deals')
  const day = await today()
  const thisMonth = day.slice(0, 7)
  const open = deals.filter((deal) => OPEN.includes(deal.stage))
  const late = deals.filter((deal) => deal.is_late)
  const wonThisMonth = deals.filter((deal) => deal.stage === 'won' && deal.close_date?.startsWith(thisMonth))
  const months = last12Months(day)
  const wonInYear = deals.filter(
    (deal) => deal.stage === 'won' && deal.close_date && months.includes(deal.close_date.slice(0, 7)),
  )

  await page.goto('/')
  await expect(page.getByText(formatDateWithWeekday(day))).toContainText(`지연된 영업 기회 ${late.length}건`)
  const figures = hero(page)
  await expect(figures).toContainText(formatMoney(sum(open)))
  await expect(figures).toContainText(`영업 기회 ${open.length}건`)
  await expect(figures).toContainText(formatMoney(sum(open, 'expected_revenue')))
  await expect(figures).toContainText(
    `파이프라인의 ${Math.round((sum(open, 'expected_revenue') / sum(open)) * 100)}%`,
  )
  await expect(figures).toContainText(formatMoney(sum(wonThisMonth)))
  await expect(figures).toContainText(`수주 ${wonThisMonth.length}건`)
  await expect(figures.getByRole('link', { name: /^지연된 영업 기회/ })).toContainText(
    `${late.length}건모두 ${formatMoney(sum(late))}`,
  )

  const band = page.getByRole('list', { name: '단계별 파이프라인' })
  for (const stage of OPEN) {
    const inStage = open.filter((deal) => deal.stage === stage)
    await expect(
      band.getByRole('link', {
        name: `${LABELS[stage]} ${inStage.length}건 ${formatMoney(sum(inStage))}`,
        exact: false,
      }),
    ).toBeVisible()
  }
  await expect(panel(page, '월별 수주 금액')).toContainText(`최근 12개월 ${formatMoney(sum(wonInYear))}`)
})

test('a deal moved to Won shows in 이번 달 수주 on the next visit', async ({ page }) => {
  const deal = (await apiGet<Deal[]>('/api/deals')).find((d) => d.stage === 'negotiation')!
  const before = (await apiGet<{ figures: Figures }>('/api/dashboard')).figures

  await page.goto('/')
  await expect(hero(page)).toContainText(formatMoney(before.won_this_month_value))
  await page.goto(`/deals/${deal.id}`)
  await page.getByRole('button', { name: /단계/ }).click()
  await page.getByRole('option', { name: '수주' }).click()
  await expect(toastText(page, /수주 단계로 옮겼어요/)).toBeVisible()

  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '대시보드' }).click()
  await expect(hero(page)).toContainText(formatMoney(before.won_this_month_value + deal.value))
  await expect(hero(page)).toContainText(`수주 ${before.won_this_month_count + 1}건`)
  await expect(hero(page)).toContainText(formatMoney(before.open_value - deal.value))
  await expect(hero(page)).toContainText(`영업 기회 ${before.open_count - 1}건`)
})

test('a new follow-up shows on the dashboard, and checking it removes it', async ({ page }) => {
  const contact = (await apiGet<{ id: number }[]>('/api/contacts'))[0]
  const tomorrow = addDays(await today(), 1)
  const text = '납품 일정표 다시 보내기'

  await page.goto(`/contacts/${contact.id}`)
  const form = page.getByRole('form', { name: '활동 기록' })
  await form.getByRole('textbox', { name: '내용 (필수)' }).fill(text)
  const [year, month, day] = tomorrow.split('-')
  await form.getByRole('group', { name: '후속 조치' }).getByRole('spinbutton', { name: /^년/ }).click()
  await page.keyboard.type(`${year}${month}${day}`)
  await form.getByRole('button', { name: '기록' }).click()
  await expect(toastText(page, '기록했어요')).toBeVisible()

  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '대시보드' }).click()
  const row = page.getByRole('list', { name: '후속 조치' }).getByRole('listitem').filter({ hasText: text })
  await expect(row).toContainText(formatMonthDay(tomorrow))
  await row.getByText(text).click()
  await expect(toastText(page, '후속 조치를 완료했어요')).toBeVisible()
  await expect(row).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('list', { name: '후속 조치' })).toBeVisible()
  await expect(row).toHaveCount(0)

  const entry = (
    await apiGet<{ items: { description: string | null; follow_up_done: boolean }[] }>(
      `/api/contacts/${contact.id}/timeline`,
    )
  ).items.find((item) => item.description === text)!
  expect(entry.follow_up_done).toBe(true)
})

test('a band block opens the pipeline, and the late figure opens the late deals', async ({ page }) => {
  const late = (await apiGet<Deal[]>('/api/deals')).filter((deal) => deal.is_late)
  await page.goto('/')
  await page.getByRole('list', { name: '단계별 파이프라인' }).getByRole('link', { name: /^협상/ }).click()
  await expect(page).toHaveURL('/pipeline')
  await expect(page.getByRole('heading', { level: 1, name: '파이프라인' })).toBeVisible()

  await page.goto('/')
  await hero(page)
    .getByRole('link', { name: /^지연된 영업 기회/ })
    .click()
  await expect(page).toHaveURL('/deals?late=1')
  await expect(page.getByRole('switch', { name: /지연된 것만/ })).toBeChecked()
  await expect(tableRows(page, '영업 기회 목록')).toHaveCount(late.length)
})

test('focusing a chart shows each month and its amount', async ({ page }) => {
  const deals = await apiGet<Deal[]>('/api/deals')
  const months = last12Months(await today())
  const wonIn = (month: string) =>
    sum(deals.filter((deal) => deal.stage === 'won' && deal.close_date?.startsWith(month)))

  await page.goto('/')
  const chart = panel(page, '월별 수주 금액')
  await chart.locator('svg[role="application"]').focus()
  const tooltip = chart.locator('.recharts-tooltip-wrapper')
  await expect(tooltip).toContainText(formatChartMonth(months[0], true))
  await expect(tooltip).toContainText(formatMoney(wonIn(months[0])))
  for (let step = 0; step < 11; step++) await page.keyboard.press('ArrowRight')
  await expect(tooltip).toContainText(formatChartMonth(months[11], true))
  await expect(tooltip).toContainText(formatMoney(wonIn(months[11])))
})

test('표로 보기 shows each chart’s figures as a table', async ({ page }) => {
  const deals = await apiGet<Deal[]>('/api/deals')
  const months = last12Months(await today())
  const counted = (stage: Stage, month: string) =>
    deals.filter((deal) => deal.stage === stage && deal.close_date?.startsWith(month)).length

  await page.goto('/')
  const chart = panel(page, '월별 수주·실주 건수')
  const toggle = chart.getByRole('button', { name: '표로 보기' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  const rows = chart.getByRole('table', { name: '월별 수주·실주 건수' }).getByRole('row')
  await expect(rows).toHaveCount(13)
  for (const [index, month] of months.entries()) {
    await expect(rows.nth(index + 1)).toHaveText(
      `${formatChartMonth(month, true)}${counted('won', month)}건${counted('lost', month)}건`,
    )
  }
  await toggle.click()
  await expect(chart.locator('svg[role="application"]')).toBeVisible()
})
