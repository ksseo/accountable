import { describe, expect, it } from 'vitest'
import { META } from '../../test/render'
import type { TimelineEntry } from './api'
import { automaticText } from './kinds'

const entry = (fields: Partial<TimelineEntry>): TimelineEntry => ({
  id: 1,
  kind: 'stage_change',
  automatic: true,
  description: null,
  occurred_at: '2026-11-23T06:20:00Z',
  follow_up_date: null,
  follow_up_done: false,
  follow_up_state: null,
  from_value: null,
  to_value: null,
  contact_id: null,
  contact_name: null,
  deal_id: null,
  deal_name: null,
  ...fields,
})

describe('automaticText', () => {
  it('names the stages of a stage change in Korean (RULE-3)', () => {
    expect(automaticText(META, entry({ from_value: 'proposal', to_value: 'negotiation' }))).toBe(
      '제안 → 협상',
    )
  })

  it('names the won deal on a status change to customer (RULE-7)', () => {
    const won = entry({
      kind: 'status_change',
      from_value: 'qualified',
      to_value: 'customer',
      description: '2027 포장재 공급',
    })
    expect(automaticText(META, won)).toBe('적격 → 고객 (‘2027 포장재 공급’ 수주)')
  })

  it('shows a status changed by hand without a deal (RULE-8)', () => {
    expect(
      automaticText(META, entry({ kind: 'status_change', from_value: 'lead', to_value: 'qualified' })),
    ).toBe('리드 → 적격')
  })
})
