import { describe, expect, it } from 'vitest'
import { lastLabelPlace, PLOT_BOTTOM, tickLabel } from './chartParts'

describe('month labels', () => {
  it('names the year on January and on the first month', () => {
    expect(tickLabel('2025-12', true, false)).toBe('2025년 12월')
    expect(tickLabel('2026-01', false, false)).toBe('2026년 1월')
    expect(tickLabel('2026-02', false, false)).toBe('2월')
  })

  it('leaves a first December without its year where labels are tight, since January follows with one', () => {
    expect(tickLabel('2025-12', true, true)).toBe('12월')
    expect(tickLabel('2026-01', false, true)).toBe('2026년 1월')
    expect(tickLabel('2025-11', true, true)).toBe('2025년 11월')
  })
})

describe("the last month's label on the line chart", () => {
  it('goes above the point when the line comes up to it or is level', () => {
    expect(lastLabelPlace(100, 92_000, 78_000)).toEqual({ y: 86, overLine: false })
    expect(lastLabelPlace(100, 78_000, 78_000)).toEqual({ y: 86, overLine: false })
  })

  it('goes under the point when the line comes down to it', () => {
    expect(lastLabelPlace(100, 123_000, 136_000)).toEqual({ y: 124, overLine: false })
  })

  it('stays off the month labels when the point is close to the axis', () => {
    expect(lastLabelPlace(PLOT_BOTTOM, 0, 123_000)).toEqual({ y: PLOT_BOTTOM - 14, overLine: true })
  })
})
