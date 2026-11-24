// The board by keyboard: Space picks a card up, the arrows move it, Space
// drops it, Escape puts it back, each step announced in Korean; the card menu
// as a second way; Enter opens the deal (SC 8, PIPE-5, PIPE-9).
import { dropped, movedTo, pickedUp, putBack } from '../../frontend/src/crm/pipeline/announcements'
import { expect, resetData, test } from '../support/fixtures'
import {
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
} from './board'
import { formatMoney } from '../../frontend/src/lib/money'

test.beforeEach(() => resetData())

/** Whether a request saves a move. The dev server's own files can have "move" in their address. */
const savesMove = (url: string) => /\/api\/deals\/\d+\/move$/.test(url)

const announcer = (page: import('@playwright/test').Page) => page.getByTestId('board-announcer')

test('Space, the arrows and Space move a card across lanes and within one, kept after a refresh', async ({
  page,
}) => {
  const board = await pipeline()
  const card = laneOf(board, 'new').deals[0]
  const newCount = laneOf(board, 'new').count
  const qualified = laneOf(board, 'qualified')
  await page.goto('/pipeline')
  const element = cardOn(page, card.id)
  await element.focus()

  await page.keyboard.press('Space')
  await expect(announcer(page)).toHaveText(
    pickedUp(card.name, { stageLabel: '신규', position: 1, total: newCount }),
  )

  await page.keyboard.press('ArrowRight')
  await expect(announcer(page)).toHaveText(
    movedTo({ stageLabel: '적격', position: 1, total: qualified.count + 1 }),
  )
  await expect(cardOn(page, card.id)).toBeFocused()
  await expect(laneTotal(page, 'qualified')).toHaveText(formatMoney(qualified.value + card.value))

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await expect(announcer(page)).toHaveText(
    movedTo({ stageLabel: '적격', position: 2, total: qualified.count + 1 }),
  )

  await page.keyboard.press('Space')
  await expect(announcer(page)).toHaveText(
    dropped(card.name, { stageLabel: '적격', position: 2, total: qualified.count + 1 }),
  )
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
  page.on('request', (request) => savesMove(request.url()) && moves.push(request.url()))
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
  await expectShownStart(
    page,
    'proposal',
    laneOf(board, 'proposal').deals.map((deal) => deal.id),
  )
  await expect(laneTotal(page, 'qualified')).toHaveText(formatMoney(laneOf(board, 'qualified').value))
  expect(moves).toEqual([])
})

test('pressing the mouse puts a picked-up card back, and the board works as before', async ({ page }) => {
  const board = await pipeline()
  const [picked, other] = laneOf(board, 'new').deals
  const moves: string[] = []
  page.on('request', (request) => savesMove(request.url()) && moves.push(request.url()))
  await page.goto('/pipeline')
  const back = putBack(picked.name, { stageLabel: '신규', position: 1, total: laneOf(board, 'new').count })

  // On an empty part of the page. Focus goes where the press put it.
  await cardOn(page, picked.id).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await expect(lane(page, 'qualified').locator(`[data-card-id="${picked.id}"]`)).toBeVisible()
  await page.getByRole('heading', { level: 1 }).click()
  await expect(announcer(page)).toHaveText(back)
  await expectShownStart(
    page,
    'new',
    laneOf(board, 'new').deals.map((deal) => deal.id),
  )
  await expect(cardOn(page, picked.id)).not.toBeFocused()
  expect(moves).toEqual([])

  // Another card drags.
  await cardOn(page, picked.id).focus()
  await page.keyboard.press('Space')
  await dragTo(page, cardOn(page, other.id), cardOn(page, laneOf(board, 'proposal').deals[0].id), 'top')
  await expect.poll(() => savedOrder('proposal').then((ids) => ids[0])).toBe(other.id)

  // Another card opens.
  await cardOn(page, picked.id).focus()
  await page.keyboard.press('Space')
  await cardOn(page, other.id).getByText(formatMoney(other.value)).click()
  await expect(page).toHaveURL(new RegExp(`/deals/${other.id}$`))
  expect(await savedOrder('new')).toContain(picked.id)
})

test('Space picks up a card after it was dragged by a name on it', async ({ page }) => {
  const deal = laneOf(await pipeline(), 'new').deals.find((item) => item.organization_id !== null)!
  await page.goto('/pipeline')
  for (const name of [deal.name, deal.organization_name!]) {
    const card = cardOn(page, deal.id)
    const grip = (await card.getByRole('link', { name, exact: true }).boundingBox())!
    const y = grip.y + 8
    await page.mouse.move(grip.x + 10, y)
    await page.mouse.down()
    await page.mouse.move(grip.x + 24, y + 4, { steps: 4 })
    await page.mouse.move(grip.x + 10, y, { steps: 4 })
    await page.mouse.up()
    await expect(card).toBeFocused()
    await page.keyboard.press('Space')
    await expect(announcer(page)).toContainText('들었어요')
    await page.keyboard.press('Escape')
    await expect(announcer(page)).toContainText('옮기지 않았어요')
  }
})

test('picking up another card puts the first one back', async ({ page }) => {
  const [first, second] = laneOf(await pipeline(), 'qualified').deals
  await page.goto('/pipeline')
  await cardOn(page, first.id).focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowLeft')
  await expect(lane(page, 'new').locator(`[data-card-id="${first.id}"]`)).toBeVisible()
  await cardOn(page, second.id).focus()
  await page.keyboard.press('Space')
  await expect(announcer(page)).toContainText(second.name)
  await expect(lane(page, 'qualified').locator(`[data-card-id="${first.id}"]`)).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await expect.poll(() => savedOrder('proposal')).toContain(second.id)
  expect(await savedOrder('qualified')).toContain(first.id)
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
  await expect
    .poll(() => shownOrder(page, 'negotiation').then((ids) => ids.slice(0, 2)))
    .toEqual([card.id, below])
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
