// Helpers for the board's end-to-end tests.
import type { Locator, Page } from '@playwright/test'
import { apiGet, apiSend, expect } from '../support/fixtures'

export type Stage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type BoardDeal = {
  id: number
  name: string
  value: number
  stage: Stage
  probability: number
  close_date: string | null
  is_late: boolean
  days_late: number
  organization_id: number | null
  organization_name: string | null
  contact_id: number | null
  contact_name: string | null
}
export type Pipeline = {
  columns: { stage: Stage; deals: BoardDeal[]; count: number; value: number; expected_revenue: number }[]
  open_value: number
  open_expected_revenue: number
  window_start: string
}

export const STAGE_LABELS: Record<Stage, string> = {
  new: '신규',
  qualified: '적격',
  proposal: '제안',
  negotiation: '협상',
  won: '수주',
  lost: '실주',
}

export const pipeline = () => apiGet<Pipeline>('/api/pipeline')

export const laneOf = (board: Pipeline, stage: Stage) => board.columns.find((column) => column.stage === stage)!

/** The ids of a lane's cards in order, as the backend has them. */
export async function savedOrder(stage: Stage): Promise<number[]> {
  return laneOf(await pipeline(), stage).deals.map((deal) => deal.id)
}

export const lane = (page: Page, stage: Stage) => page.locator(`section[aria-labelledby="lane-${stage}"]`)

export const cardOn = (page: Page, id: number) => page.locator(`[data-card-id="${id}"]`)

/** The ids of a lane's cards in the order the page shows them. */
export function shownOrder(page: Page, stage: Stage): Promise<number[]> {
  return lane(page, stage)
    .locator('[data-card-id]')
    .evaluateAll((cards) => cards.map((card) => Number(card.getAttribute('data-card-id'))))
}

/** A lane's total, the large amount under its name. */
export const laneTotal = (page: Page, stage: Stage) => lane(page, stage).locator('p').first()

/** Moves a deal to the top of its lane through the API, so a test can reach it without scrolling. */
export async function bringToTop(dealId: number): Promise<void> {
  const board = await pipeline()
  const column = board.columns.find((item) => item.deals.some((deal) => deal.id === dealId))!
  const first = column.deals[0].id
  if (first === dealId) return
  await apiSend('POST', `/api/deals/${dealId}/move`, { stage: column.stage, after_id: null, before_id: first })
}

/** Drags a card with the mouse until its middle is over the top or bottom
 * quarter of another card, and drops it. The board places a card by where
 * the dragged card's middle is, as a person sees it, not by the pointer. */
export async function dragTo(page: Page, card: Locator, target: Locator, where: 'top' | 'bottom' = 'top'): Promise<void> {
  await card.scrollIntoViewIfNeeded()
  const from = (await card.boundingBox())!
  const grab = 15
  await page.mouse.move(from.x + 40, from.y + grab)
  await page.mouse.down()
  await page.mouse.move(from.x + 48, from.y + grab + 9, { steps: 4 })
  const to = (await target.boundingBox())!
  const middle = to.y + to.height * (where === 'top' ? 0.25 : 0.75)
  const y = middle - from.height / 2 + grab
  // Down or up to the target's height first, then across, so the card
  // enters another lane at the height it's meant to land.
  await page.mouse.move(from.x + 48, y, { steps: 8 })
  await page.mouse.move(to.x + 40, y, { steps: 14 })
  await page.mouse.move(to.x + 42, y + 1, { steps: 3 })
  await page.mouse.up()
}

/** The cards a lane draws are, in order, the first cards of `expected`. A lane
 * only draws the cards in view, so the page may show fewer than the lane holds. */
export async function expectShownStart(page: Page, stage: Stage, expected: number[]): Promise<void> {
  await expect
    .poll(async () => {
      const shown = await shownOrder(page, stage)
      if (shown.length === 0) return ['nothing drawn']
      return shown.flatMap((id, index) => (id === expected[index] ? [] : [`place ${index + 1}: ${id}, expected ${expected[index]}`]))
    })
    .toEqual([])
}
