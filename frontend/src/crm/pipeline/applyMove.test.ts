import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { StageKey } from '../meta'
import {
  applyMove,
  changeStage,
  expectedRevenue,
  isSamePlace,
  neighbours,
  placeByArrow,
  placementOf,
  type Board,
  type Card,
  type MoveRules,
} from './applyMove'

// The same cases the backend's tests read, so both round the same way (RULE-1).
// The path goes through a variable so Vite doesn't turn it into an asset address.
const CASES_FILE = '../../../../backend/tests/crm/expected_revenue_cases.json'
const CASES = JSON.parse(readFileSync(new URL(CASES_FILE, import.meta.url), 'utf8')) as {
  value: number
  probability: number
  expected: number
  why: string
}[]

const USUAL: Record<StageKey, number> = {
  new: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
}
const RULES: MoveRules = { today: '2026-11-23', usualProbability: (stage) => USUAL[stage] }

let nextId = 1
function card(stage: StageKey, value: number, extra: Partial<Card> = {}): Card {
  const probability = extra.probability ?? USUAL[stage]
  return {
    id: nextId++,
    name: `Deal ${nextId}`,
    value,
    stage,
    probability,
    expected_revenue: expectedRevenue(value, probability),
    close_date: '2026-12-31',
    is_late: false,
    days_late: 0,
    position: 0,
    furthest_open_stage: stage === 'won' || stage === 'lost' ? 'negotiation' : stage,
    organization_id: null,
    organization_name: null,
    contact_id: null,
    contact_name: null,
    notes: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...extra,
  } as Card
}

function board(lanes: Partial<Record<StageKey, Card[]>>): Board {
  const stages: StageKey[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
  const columns = stages.map((stage) => {
    const deals = lanes[stage] ?? []
    return {
      stage,
      deals,
      count: deals.length,
      value: deals.reduce((total, deal) => total + deal.value, 0),
      expected_revenue: deals.reduce((total, deal) => total + deal.expected_revenue, 0),
    }
  })
  const open = columns.slice(0, 4)
  return {
    columns,
    open_count: open.reduce((total, column) => total + column.count, 0),
    open_value: open.reduce((total, column) => total + column.value, 0),
    open_expected_revenue: open.reduce((total, column) => total + column.expected_revenue, 0),
    window_start: '2026-10-24',
  }
}

const ids = (at: Board, stage: StageKey) =>
  at.columns.find((column) => column.stage === stage)!.deals.map((deal) => deal.id)
const column = (at: Board, stage: StageKey) => at.columns.find((item) => item.stage === stage)!

describe('expectedRevenue', () => {
  it.each(CASES)('$value at $probability% is $expected ($why)', ({ value, probability, expected }) => {
    expect(expectedRevenue(value, probability)).toBe(expected)
  })
})

describe('applyMove', () => {
  const a = card('new', 10_000)
  const b = card('new', 20_000)
  const c = card('new', 30_000)
  const d = card('proposal', 40_000)
  const e = card('proposal', 50_000)
  const start = board({ new: [a, b, c], proposal: [d, e] })

  it('puts the card between two cards in another lane', () => {
    const moved = applyMove(start, { dealId: a.id, stage: 'proposal', index: 1 }, RULES)
    expect(ids(moved, 'new')).toEqual([b.id, c.id])
    expect(ids(moved, 'proposal')).toEqual([d.id, a.id, e.id])
  })

  it('puts the card at the top and at the bottom of a lane', () => {
    expect(ids(applyMove(start, { dealId: c.id, stage: 'new', index: 0 }, RULES), 'new')).toEqual([
      c.id,
      a.id,
      b.id,
    ])
    expect(ids(applyMove(start, { dealId: a.id, stage: 'new', index: 2 }, RULES), 'new')).toEqual([
      b.id,
      c.id,
      a.id,
    ])
    expect(ids(applyMove(start, { dealId: a.id, stage: 'proposal', index: 2 }, RULES), 'proposal')).toEqual([
      d.id,
      e.id,
      a.id,
    ])
  })

  it('moves a card up and down within its lane', () => {
    expect(ids(applyMove(start, { dealId: b.id, stage: 'new', index: 0 }, RULES), 'new')).toEqual([
      b.id,
      a.id,
      c.id,
    ])
    expect(ids(applyMove(start, { dealId: b.id, stage: 'new', index: 2 }, RULES), 'new')).toEqual([
      a.id,
      c.id,
      b.id,
    ])
  })

  it('puts a card into an empty lane', () => {
    const moved = applyMove(start, { dealId: e.id, stage: 'negotiation', index: 0 }, RULES)
    expect(ids(moved, 'negotiation')).toEqual([e.id])
    expect(column(moved, 'negotiation').count).toBe(1)
  })

  it('changes both lanes’ totals and the open totals at once', () => {
    const moved = applyMove(start, { dealId: a.id, stage: 'proposal', index: 0 }, RULES)
    expect(column(moved, 'new')).toMatchObject({ count: 2, value: 50_000, expected_revenue: 5_000 })
    // 10,000 at 50% is 5,000 more expected revenue in Proposal.
    expect(column(moved, 'proposal')).toMatchObject({ count: 3, value: 100_000, expected_revenue: 50_000 })
    expect(moved.open_count).toBe(5)
    expect(moved.open_value).toBe(150_000)
    expect(moved.open_expected_revenue).toBe(start.open_expected_revenue - 1_000 + 5_000)
  })

  it('takes Won and Lost out of the open totals', () => {
    const won = applyMove(start, { dealId: d.id, stage: 'won', index: 0 }, RULES)
    expect(won.open_count).toBe(4)
    expect(won.open_value).toBe(110_000)
    expect(column(won, 'won')).toMatchObject({ count: 1, value: 40_000, expected_revenue: 40_000 })
    const lost = applyMove(start, { dealId: d.id, stage: 'lost', index: 0 }, RULES)
    expect(column(lost, 'lost')).toMatchObject({ count: 1, value: 40_000, expected_revenue: 0 })
  })

  it('leaves the lanes it doesn’t touch as they were', () => {
    const moved = applyMove(start, { dealId: a.id, stage: 'new', index: 1 }, RULES)
    expect(column(moved, 'proposal')).toBe(column(start, 'proposal'))
  })

  it('works out the neighbours the backend places the card between', () => {
    const moved = applyMove(start, { dealId: a.id, stage: 'proposal', index: 1 }, RULES)
    expect(neighbours(moved, a.id)).toEqual({ after_id: d.id, before_id: e.id })
    const top = applyMove(start, { dealId: c.id, stage: 'new', index: 0 }, RULES)
    expect(neighbours(top, c.id)).toEqual({ after_id: null, before_id: a.id })
    const alone = applyMove(start, { dealId: e.id, stage: 'won', index: 0 }, RULES)
    expect(neighbours(alone, e.id)).toEqual({ after_id: null, before_id: null })
  })

  it('knows when a card is dropped where it was', () => {
    expect(placementOf(start, b.id)).toEqual({ dealId: b.id, stage: 'new', index: 1 })
    expect(isSamePlace(start, { dealId: b.id, stage: 'new', index: 1 })).toBe(true)
    expect(isSamePlace(start, { dealId: b.id, stage: 'new', index: 0 })).toBe(false)
  })
})

describe('placeByArrow (PIPE-9)', () => {
  const a = card('new', 10_000)
  const b = card('new', 20_000)
  const c = card('new', 30_000)
  const d = card('qualified', 40_000)
  const e = card('lost', 50_000)
  const start = board({ new: [a, b, c], qualified: [d], lost: [e] })
  const press = (key: string, deal: Card) => placeByArrow(start, placementOf(start, deal.id)!, key)

  it('moves up and down the lane', () => {
    expect(press('ArrowUp', b)).toEqual({ dealId: b.id, stage: 'new', index: 0 })
    expect(press('ArrowDown', b)).toEqual({ dealId: b.id, stage: 'new', index: 2 })
  })

  it('moves to the same place in the lane beside it, or the bottom of a shorter one', () => {
    expect(press('ArrowRight', a)).toEqual({ dealId: a.id, stage: 'qualified', index: 0 })
    expect(press('ArrowRight', c)).toEqual({ dealId: c.id, stage: 'qualified', index: 1 })
    expect(press('ArrowRight', d)).toEqual({ dealId: d.id, stage: 'proposal', index: 0 })
    expect(press('ArrowLeft', d)).toEqual({ dealId: d.id, stage: 'new', index: 0 })
  })

  it('goes nowhere at the ends of the lane and the board', () => {
    expect(press('ArrowUp', a)).toBeNull()
    expect(press('ArrowDown', c)).toBeNull()
    expect(press('ArrowLeft', a)).toBeNull()
    expect(press('ArrowRight', e)).toBeNull()
  })
})

describe('changeStage (RULE-3)', () => {
  it('sets the stage’s usual probability and works out expected revenue again', () => {
    const moved = changeStage(card('new', 12_345), 'proposal', RULES)
    expect(moved.probability).toBe(50)
    expect(moved.expected_revenue).toBe(6_173)
  })

  it('sets today’s close date for Won and Lost, and a closed deal is never late', () => {
    const late = card('proposal', 1_000, { close_date: '2026-11-01', is_late: true, days_late: 22 })
    const won = changeStage(late, 'won', RULES)
    expect(won).toMatchObject({ close_date: '2026-11-23', is_late: false, days_late: 0, probability: 100 })
  })

  it('keeps the close date between open stages and works out lateness again', () => {
    const late = card('new', 1_000, { close_date: '2026-11-14' })
    const moved = changeStage(late, 'qualified', RULES)
    expect(moved).toMatchObject({ close_date: '2026-11-14', is_late: true, days_late: 9 })
  })

  it('moves the furthest stage forward but never back', () => {
    const deal = card('proposal', 1_000)
    expect(changeStage(deal, 'negotiation', RULES).furthest_open_stage).toBe('negotiation')
    expect(changeStage(deal, 'new', RULES).furthest_open_stage).toBe('proposal')
    expect(changeStage(deal, 'lost', RULES).furthest_open_stage).toBe('proposal')
  })

  it('leaves a card that stays in its stage as it is', () => {
    const deal = card('qualified', 1_000, { probability: 40 })
    expect(changeStage(deal, 'qualified', RULES)).toBe(deal)
  })
})
