// The board by keyboard: Space picks a card up, the arrows move it, Space
// drops it, Escape puts it back, each step announced in Korean; the card menu
// as a second way; Enter opens the deal (SC 8, PIPE-5, PIPE-9).
import { dropped, movedTo, pickedUp, putBack } from '../../frontend/src/crm/pipeline/announcements'
import { expect, resetData, test } from '../support/fixtures'
import { cardOn, expectShownStart, lane, laneOf, laneTotal, pipeline, savedOrder, shownOrder, STAGE_LABELS } from './board'
import { formatMoney } from '../../frontend/src/lib/money'

test.beforeEach(() => resetData())

const announcer = (page: import('@playwright/test').Page) => page.getByTestId('board-announcer')

test('Space, the arrows and Space move a card across lanes and within one, kept after a refresh', async ({ page }) => {
  const board = await pipeline()
  const card = laneOf(board, 'new').deals[0]
  const newCount = laneOf(board, 'new').count
  const qualified = laneOf(board, 'qualified')
  await page.goto('/pipeline')
  const element = cardOn(page, card.id)
  await element.focus()

  await page.keyboard.press('Space')
  await expect(announcer(page)).toHaveText(pickedUp(card.name, { stageLabel: '신규', position: 1, total: newCount }))

  await page.keyboard.press('ArrowRight')
  await expect(announcer(page)).toHaveText(movedTo({ stageLabel: '적격', position: 1, total: qualified.count + 1 }))
  await expect(cardOn(page, card.id)).toBeFocused()
  await expect(laneTotal(page, 'qualified')).toHaveText(formatMoney(qualified.value + card.value))

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await expect(announcer(page)).toHaveText(movedTo({ stageLabel: '적격', position: 2, total: qualified.count + 1 }))

  await page.keyboard.press('Space')
  await expect(announcer(page)).toHaveText(dropped(card.name, { stageLabel: '적격', position: 2, total: qualified.count + 1 }))
  await expect(page.getByRole('status').getByText('적격 단계로 옮겼어요')).toBeVisible()
  await expect(cardOn(page, card.id)).toBeFocused()
  await expect.poll(() => savedOrder('qualified').then((ids) => ids.indexOf(card.id))).toBe(1)

  await page.reload()
  await expect.poll(() => shownOrder(page, 'qualified').then((ids) => ids.indexOf(card.id))).toBe(1)
  await expect(cardOn(page, card.id)).toContainText('25%')
})

test('Escape puts the card back and saves nothing', async ({ page }) => {
  const board = await pipeline()
  const card = laneOf(board, 'proposal').deals[1]
  const moves: string[] = []
  page.on('request', (request) => request.url().includes('/move') && moves.push(request.url()))
  await page.goto('/pipeline')
  await cardOn(page, card.id).focus()

  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowUp')
  await expect(lane(page, 'qualified').locator(`[data-card-id="${card.id}"]`)).toBeVisible()
  await page.keyboard.press('Escape')

  await expect(announcer(page)).toHaveText(
    putBack(card.name, { stageLabel: '제안', position: 2, total: laneOf(board, 'proposal').count }),
  )
  await expect(cardOn(page, card.id)).toBeFocused()
  await expectShownStart(page, 'proposal', laneOf(board, 'proposal').deals.map((deal) => deal.id))
  await expect(laneTotal(page, 'qualified')).toHaveText(formatMoney(laneOf(board, 'qualified').value))
  expect(moves).toEqual([])
})

test('the card menu moves a card to another stage, up and down', async ({ page }) => {
  const board = await pipeline()
  const card = laneOf(board, 'new').deals[0]
  await page.goto('/pipeline')

  // 단계 이동, by keyboard.
  await page.getByRole('button', { name: `${card.name} 메뉴` }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: '위로' })).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: '단계 이동' })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  const stages = page.getByRole('menu', { name: '단계 이동' })
  await expect(stages.getByRole('menuitem', { name: STAGE_LABELS.new })).toBeDisabled()
  await expect(stages.getByRole('menuitem', { name: '적격' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(stages.getByRole('menuitem', { name: '협상' })).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('status').getByText('협상 단계로 옮겼어요')).toBeVisible()
  await expect(page.getByRole('button', { name: `${card.name} 메뉴` })).toBeFocused()
  await expect.poll(() => savedOrder('negotiation').then((ids) => ids[0])).toBe(card.id)
  await expect(cardOn(page, card.id)).toContainText('75%')

  // 아래로, then 위로.
  const below = laneOf(board, 'negotiation').deals[0].id
  await page.getByRole('button', { name: `${card.name} 메뉴` }).click()
  await page.getByRole('menuitem', { name: '아래로' }).click()
  await expect.poll(() => savedOrder('negotiation').then((ids) => ids.slice(0, 2))).toEqual([below, card.id])
  await page.getByRole('button', { name: `${card.name} 메뉴` }).click()
  await page.getByRole('menuitem', { name: '위로' }).click()
  await expect.poll(() => savedOrder('negotiation').then((ids) => ids.slice(0, 2))).toEqual([card.id, below])
  await page.reload()
  await expect.poll(() => shownOrder(page, 'negotiation').then((ids) => ids.slice(0, 2))).toEqual([card.id, below])
})

test('Enter opens the deal, and only Space picks a card up', async ({ page }) => {
  const card = laneOf(await pipeline(), 'qualified').deals[0]
  await page.goto('/pipeline')
  await cardOn(page, card.id).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/deals/${card.id}$`))
  await expect(announcer(page)).toHaveCount(0)
})

test('each card says how to move it', async ({ page }) => {
  const card = laneOf(await pipeline(), 'proposal').deals[0]
  await page.goto('/pipeline')
  await expect(cardOn(page, card.id)).toHaveAccessibleDescription(/스페이스 키로 카드를 들고/)
  await expect(cardOn(page, card.id)).toHaveAccessibleName(`${card.name}, ${formatMoney(card.value)}`)
})
