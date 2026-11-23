// A card moved on the board, worked out in the browser so the card and every
// total change at once, before the save finishes (PIPE-8). The backend applies
// the same rules (RULE-1, RULE-3) and its answer replaces this guess.

import type { Schemas } from '../../api/client'
import { daysBetween } from '../../lib/dates'
import { isClosed, OPEN_STAGES, type StageKey } from '../meta'

export type Board = Schemas['Pipeline']
export type Card = Schemas['Deal']

/** Where a card goes: a stage and its place in that lane, counted from 0 with
 * the card itself taken out. */
export type Placement = { dealId: number; stage: StageKey; index: number }

export type MoveRules = {
  /** Today, from /api/meta. */
  today: string
  usualProbability: (stage: StageKey) => number
}

/** value x probability / 100, rounded half up to the dollar (RULE-1). */
export function expectedRevenue(value: number, probability: number): number {
  return Math.floor((value * probability + 50) / 100)
}

const OPEN_ORDER: readonly string[] = OPEN_STAGES

function furthest(current: Card['furthest_open_stage'], stage: StageKey): Card['furthest_open_stage'] {
  if (isClosed(stage)) return current
  return OPEN_ORDER.indexOf(stage) > OPEN_ORDER.indexOf(current) ? (stage as Card['furthest_open_stage']) : current
}

/** The card after a change of stage (RULE-3): the stage's usual probability,
 * today's close date for Won or Lost, and lateness worked out again. */
export function changeStage(card: Card, stage: StageKey, rules: MoveRules): Card {
  if (card.stage === stage) return card
  const probability = rules.usualProbability(stage)
  const closeDate = isClosed(stage) ? rules.today : card.close_date
  const late = !isClosed(stage) && closeDate !== null && closeDate < rules.today
  return {
    ...card,
    stage,
    probability,
    expected_revenue: expectedRevenue(card.value, probability),
    close_date: closeDate,
    is_late: late,
    days_late: late && closeDate ? daysBetween(closeDate, rules.today) : 0,
    furthest_open_stage: furthest(card.furthest_open_stage, stage),
  }
}

function withTotals(column: Board['columns'][number], deals: Card[]): Board['columns'][number] {
  return {
    ...column,
    deals,
    count: deals.length,
    value: deals.reduce((total, deal) => total + deal.value, 0),
    expected_revenue: deals.reduce((total, deal) => total + deal.expected_revenue, 0),
  }
}

/** Where a card is now: its stage and its place in the lane. */
export function placementOf(board: Board, dealId: number): Placement | null {
  for (const column of board.columns) {
    const index = column.deals.findIndex((deal) => deal.id === dealId)
    if (index >= 0) return { dealId, stage: column.stage, index }
  }
  return null
}

/** The board with one card moved: the card in its new place, its lane's and
 * the old lane's totals, and the open totals above the board. */
export function applyMove(board: Board, placement: Placement, rules: MoveRules): Board {
  const from = placementOf(board, placement.dealId)
  if (!from) return board
  const card = board.columns.find((column) => column.stage === from.stage)!.deals[from.index]
  const moved = changeStage(card, placement.stage, rules)

  const columns = board.columns.map((column) => {
    if (column.stage !== from.stage && column.stage !== placement.stage) return column
    const deals = column.deals.filter((deal) => deal.id !== placement.dealId)
    if (column.stage === placement.stage) {
      const index = Math.max(0, Math.min(placement.index, deals.length))
      deals.splice(index, 0, moved)
    }
    return withTotals(column, deals)
  })

  const open = columns.filter((column) => !isClosed(column.stage))
  return {
    ...board,
    columns,
    open_count: open.reduce((total, column) => total + column.count, 0),
    open_value: open.reduce((total, column) => total + column.value, 0),
    open_expected_revenue: open.reduce((total, column) => total + column.expected_revenue, 0),
  }
}

/** The cards above and below a card in its lane, which the backend places it between (PIPE-6). */
export function neighbours(board: Board, dealId: number): { after_id: number | null; before_id: number | null } {
  const at = placementOf(board, dealId)
  if (!at) return { after_id: null, before_id: null }
  const deals = board.columns.find((column) => column.stage === at.stage)!.deals
  return { after_id: deals[at.index - 1]?.id ?? null, before_id: deals[at.index + 1]?.id ?? null }
}

/** Whether a placement leaves the card where it already is. */
export function isSamePlace(board: Board, placement: Placement): boolean {
  const at = placementOf(board, placement.dealId)
  return at !== null && at.stage === placement.stage && at.index === placement.index
}
