// The board by mouse: lanes, cards, drag and drop and the totals
// (SC 4, PIPE-1 to PIPE-8, RULE-3, RULE-7, RULE-14).
import { formatDate } from '../../frontend/src/lib/dates'
import { formatMoney } from '../../frontend/src/lib/money'
import { apiGet, apiSend, expect, resetData, test, today } from '../support/fixtures'
import {
  bringToTop,
  cardOn,
  dragTo,
  expectShownStart,
  lane,
  laneOf,
  laneTotal,
  pipeline,
  savedOrder,
  shownOrder,
  STAGE_LABELS,
  type BoardDeal,
} from './board'
import { search, tableRows } from './helpers'

type Contact = { id: number; name: string; status: string }

test.beforeEach(() => resetData())

test('shows six lanes with their counts and totals, and the open totals above', async ({ page }) => {
  const board = await pipeline()
  await page.goto('/pipeline')
  await expect(
    page.getByText(
      `진행 중 ${formatMoney(board.open_value)}, 예상 매출 ${formatMoney(board.open_expected_revenue)}.`,
    ),
  ).toBeVisible()
  for (const column of board.columns) {
    const section = lane(page, column.stage)
    await expect(section.getByRole('heading', { level: 2 })).toHaveText(STAGE_LABELS[column.stage])
    await expect(section).toContainText(`영업 기회 ${column.count}건`)
    await expect(laneTotal(page, column.stage)).toHaveText(formatMoney(column.value))
    if (column.stage === 'won' || column.stage === 'lost') await expect(section).toContainText('최근 30일')
    else await expect(section).toContainText(`예상 ${formatMoney(column.expected_revenue)}`)
  }
})

test('Won and Lost show only the last 30 days', async ({ page }) => {
  const board = await pipeline()
  const deals = await apiGet<BoardDeal[]>('/api/deals')
  for (const stage of ['won', 'lost'] as const) {
    const recent = deals.filter((deal) => deal.stage === stage && deal.close_date! >= board.window_start)
    expect(deals.filter((deal) => deal.stage === stage).length).toBeGreaterThan(recent.length)
    await page.goto('/pipeline')
    await expect
      .poll(() => shownOrder(page, stage).then((ids) => ids.sort()))
      .toEqual(recent.map((deal) => deal.id).sort())
  }
})

test('late cards show the chip with the days late', async ({ page }) => {
  const board = await pipeline()
  const late = board.columns.flatMap((column) => column.deals).find((deal) => deal.is_late)!
  await bringToTop(late.id)
  await page.goto('/pipeline')
  await expect(cardOn(page, late.id)).toContainText(`지연 ${late.days_late}일`)
})

test('dragging to another lane changes the stage and probability, kept after a refresh', async ({ page }) => {
  const board = await pipeline()
  const moved = laneOf(board, 'new').deals[0]
  const target = laneOf(board, 'proposal').deals[1]
  await page.goto('/pipeline')
  await dragTo(page, cardOn(page, moved.id), cardOn(page, target.id), 'top')

  await expect(page.getByRole('status').getByText(`‘${moved.name}’`)).toContainText('제안 단계로 옮겼어요')
  await expect(cardOn(page, moved.id)).toContainText('50%')
  await page.reload()
  expect((await savedOrder('proposal')).indexOf(moved.id)).toBe(1)
  await expectShownStart(page, 'proposal', await savedOrder('proposal'))

  await page.goto('/deals')
  await search(page, '영업 기회 검색', moved.name)
  const row = tableRows(page, '영업 기회 목록').first()
  await expect(row).toContainText('제안')
  await expect(row).toContainText('50%')
})

test('dropping lower, higher and between two cards in its own lane stays after a refresh', async ({
  page,
}) => {
  const before = await savedOrder('new')
  expect(before.length).toBeGreaterThanOrEqual(4)
  const [a, b, c, ...rest] = before
  await page.goto('/pipeline')

  // Lower: the first card onto the lower part of the second.
  await dragTo(page, cardOn(page, a), cardOn(page, b), 'bottom')
  await expect.poll(() => savedOrder('new')).toEqual([b, a, c, ...rest])

  // Higher: back onto the upper part of the card now first.
  await page.reload()
  await dragTo(page, cardOn(page, a), cardOn(page, b), 'top')
  await expect.poll(() => savedOrder('new')).toEqual(before)

  // Between: the first card onto the lower part of the third, so between the third and the fourth.
  await page.reload()
  await dragTo(page, cardOn(page, a), cardOn(page, c), 'bottom')
  await expect.poll(() => savedOrder('new')).toEqual([b, c, a, ...rest])
  await page.reload()
  await expectShownStart(page, 'new', [b, c, a, ...rest])
})

test('dropping into an empty lane and below its last card stays after a refresh', async ({ page }) => {
  for (const id of await savedOrder('lost')) await apiSend('DELETE', `/api/deals/${id}`)
  const [first, second] = await savedOrder('new')
  await page.goto('/pipeline')
  await expect(lane(page, 'lost')).toContainText('영업 기회 0건')

  await dragTo(page, cardOn(page, first), lane(page, 'lost'), 'top')
  await expect.poll(() => savedOrder('lost')).toEqual([first])
  await expect(lane(page, 'lost').locator(`[data-card-id="${first}"]`)).toContainText('0%')

  await page.reload()
  await dragTo(page, cardOn(page, second), cardOn(page, first), 'bottom')
  await expect.poll(() => savedOrder('lost')).toEqual([first, second])
  await page.reload()
  await expectShownStart(page, 'lost', [first, second])
})

test('the totals change before a slow save finishes', async ({ page }) => {
  const board = await pipeline()
  const moved = laneOf(board, 'new').deals[0]
  const target = laneOf(board, 'negotiation').deals[0]
  let saved = false
  await page.route('**/api/deals/*/move', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    await route.continue()
    saved = true
  })
  await page.goto('/pipeline')
  await dragTo(page, cardOn(page, moved.id), cardOn(page, target.id), 'top')

  const negotiation = laneOf(board, 'negotiation')
  await expect(laneTotal(page, 'negotiation')).toHaveText(formatMoney(negotiation.value + moved.value), {
    timeout: 1_000,
  })
  await expect(laneTotal(page, 'new')).toHaveText(formatMoney(laneOf(board, 'new').value - moved.value))
  await expect(page.getByText(`진행 중 ${formatMoney(board.open_value)}, 예상 매출 `)).toBeVisible()
  expect(saved).toBe(false)
  await expect(page.getByRole('status').getByText('협상 단계로 옮겼어요')).toBeVisible({ timeout: 5_000 })
})

test.describe('when the save fails', () => {
  test.use({ allowConsole: [/status of 500/] })

  test('the card goes back and the message says so', async ({ page }) => {
    const board = await pipeline()
    const moved = laneOf(board, 'new').deals[0]
    const target = laneOf(board, 'qualified').deals[0]
    await page.route('**/api/deals/*/move', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"broken"}' }),
    )
    await page.goto('/pipeline')
    await dragTo(page, cardOn(page, moved.id), cardOn(page, target.id), 'top')
    await expect(page.getByText('이동하지 못했어요. 다시 시도해 주세요.')).toBeVisible()
    await expect(lane(page, 'new').locator(`[data-card-id="${moved.id}"]`)).toBeVisible()
    await expect(laneTotal(page, 'new')).toHaveText(formatMoney(laneOf(board, 'new').value))
    expect(await savedOrder('new')).toEqual(laneOf(board, 'new').deals.map((deal) => deal.id))
  })
})

test('moving to Won sets today as the close date, makes the contact a customer and says so', async ({
  page,
}) => {
  const contacts = await apiGet<Contact[]>('/api/contacts')
  const board = await pipeline()
  const moved = board.columns
    .filter((column) => column.stage === 'negotiation' || column.stage === 'proposal')
    .flatMap((column) => column.deals)
    .find(
      (deal) =>
        contacts.find((contact) => contact.id === deal.contact_id)?.status !== 'customer' && deal.contact_id,
    )!
  await bringToTop(moved.id)
  const won = laneOf(board, 'won').deals[0]
  await page.goto('/pipeline')
  await dragTo(page, cardOn(page, moved.id), cardOn(page, won.id), 'top')

  await expect(page.getByRole('status').getByText(`${moved.contact_name} 님이 고객이 되었어요`)).toBeVisible()
  const card = lane(page, 'won').locator(`[data-card-id="${moved.id}"]`)
  await expect(card).toContainText(formatDate(await today()))
  await expect(card).toContainText('100%')
  const contact = await apiGet<Contact>(`/api/contacts/${moved.contact_id}`)
  expect(contact.status).toBe('customer')
})

test('"추가" in a lane opens the form with its stage, and the new deal goes to the top', async ({ page }) => {
  await page.goto('/pipeline')
  await page.getByRole('button', { name: '협상 단계에 영업 기회 추가' }).click()
  const form = page.getByRole('dialog', { name: '영업 기회 추가' })
  await expect(form.getByRole('button', { name: /단계/ })).toContainText('협상')
  await expect(form.getByRole('textbox', { name: '확률' })).toHaveValue('75')
  await form.getByRole('textbox', { name: '이름 (필수)' }).fill('보드에서 추가한 건')
  await form.getByRole('textbox', { name: '금액 (필수)' }).fill('8000')
  await form.getByRole('button', { name: '저장' }).click()
  await expect(form).toBeHidden()

  const added = laneOf(await pipeline(), 'negotiation').deals[0]
  expect(added.name).toBe('보드에서 추가한 건')
  await expect.poll(() => shownOrder(page, 'negotiation').then((ids) => ids[0])).toBe(added.id)
})

test('clicking a card opens the deal', async ({ page }) => {
  const deal = laneOf(await pipeline(), 'qualified').deals[0]
  await page.goto('/pipeline')
  await cardOn(page, deal.id).getByText(formatMoney(deal.value)).click()
  await expect(page).toHaveURL(new RegExp(`/deals/${deal.id}$`))
})

test('the names on a card link to their own pages (UI-7)', async ({ page }) => {
  const deal = laneOf(await pipeline(), 'qualified').deals.find((item) => item.organization_id !== null)!
  await page.goto('/pipeline')
  const card = cardOn(page, deal.id)
  await expect(card.getByRole('link', { name: deal.name, exact: true })).toHaveAttribute(
    'href',
    `/deals/${deal.id}`,
  )
  await card.getByRole('link', { name: deal.organization_name!, exact: true }).click()
  await expect(page).toHaveURL(`/organizations/${deal.organization_id}`)
})

test('letting go after Escape, or after dragging a card by a name on it, opens nothing', async ({ page }) => {
  const deal = laneOf(await pipeline(), 'new').deals.find((item) => item.organization_id !== null)!
  await bringToTop(deal.id)
  const order = await savedOrder('new')
  // A full page load would lose this, so it also shows that no link was followed.
  await page.goto('/pipeline')
  await page.evaluate(() => Object.assign(window, { samePage: true }))
  const card = cardOn(page, deal.id)
  const stillHere = async () => {
    await page.waitForTimeout(400)
    expect(page.url()).toMatch(/\/pipeline$/)
    expect(await page.evaluate(() => 'samePage' in window)).toBe(true)
  }

  const grips = [
    card.getByRole('link', { name: deal.name, exact: true }),
    card.getByRole('link', { name: deal.organization_name!, exact: true }),
    card.getByText(formatMoney(deal.value)),
  ]
  for (const grip of grips) {
    // Letting go at once, or a while after Escape.
    for (const wait of [0, 600]) {
      const box = (await grip.boundingBox())!
      const at = { x: box.x + 10, y: box.y + box.height / 2 }
      await page.mouse.move(at.x, at.y)
      await page.mouse.down()
      await page.mouse.move(at.x + 14, at.y + 4, { steps: 4 })
      await page.keyboard.press('Escape')
      if (wait) await page.waitForTimeout(wait)
      await page.mouse.move(at.x, at.y)
      await page.mouse.up()
      await stillHere()
    }
    // Dropped where it was.
    const box = (await grip.boundingBox())!
    await page.mouse.move(box.x + 10, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 24, box.y + box.height / 2 + 4, { steps: 4 })
    await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 4 })
    await page.mouse.up()
    await stillHere()
  }
  expect(await savedOrder('new')).toEqual(order)

  // The keyboard and the next click work as before.
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '연락처' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/contacts')
  await page.goBack()
  await cardOn(page, deal.id).getByText(formatMoney(deal.value)).click()
  await expect(page).toHaveURL(new RegExp(`/deals/${deal.id}$`))
})
