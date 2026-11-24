import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithApp } from '../../test/render'
import type { BandStage } from './api'
import { BAND_MIN_SHARE, PipelineBand } from './PipelineBand'
import { shareWidths } from './widths'

const BAND: BandStage[] = [
  { stage: 'new', count: 9, value: 252_000, expected_revenue: 25_200 },
  { stage: 'qualified', count: 1, value: 8_000, expected_revenue: 2_000 },
  { stage: 'proposal', count: 9, value: 541_500, expected_revenue: 270_750 },
  { stage: 'negotiation', count: 8, value: 757_000, expected_revenue: 567_750 },
]

const growOf = (stage: string) =>
  Number((document.querySelector(`[data-stage="${stage}"]`) as HTMLElement).style.flexGrow)

describe('shareWidths', () => {
  it('follows value when every stage is big enough', () => {
    const widths = shareWidths([100, 200, 300, 400], 0.05)
    expect(widths.map((width) => Math.round(width * 100))).toEqual([10, 20, 30, 40])
  })

  it('gives a small stage the minimum and shares the rest in proportion', () => {
    const widths = shareWidths([1, 300, 300, 400], 0.14)
    expect(widths[0]).toBeCloseTo(0.14)
    expect(widths[1] / widths[3]).toBeCloseTo(300 / 400)
    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(1)
  })

  it('makes empty stages equal', () => {
    expect(shareWidths([0, 0, 0, 0], 0.14)).toEqual([0.25, 0.25, 0.25, 0.25])
  })
})

describe('PipelineBand', () => {
  it('sizes each block by value, keeping a small stage at the minimum', () => {
    renderWithApp(<PipelineBand band={BAND} />)
    expect(growOf('qualified')).toBeCloseTo(BAND_MIN_SHARE)
    expect(growOf('negotiation') / growOf('proposal')).toBeCloseTo(757_000 / 541_500)
    expect(growOf('negotiation')).toBeGreaterThan(growOf('new'))
  })

  it('shows each stage’s name, count, value and expected revenue, and links to the board', () => {
    renderWithApp(<PipelineBand band={BAND} />)
    const band = screen.getByRole('list', { name: '단계별 파이프라인' })
    const proposal = within(band).getByRole('link', { name: /^제안\s?9건\s?\$541,500\s?예상 \$270,750$/ })
    expect(proposal).toHaveAttribute('href', '/pipeline')
    expect(band).toHaveTextContent('예상 $567,750')
    expect(
      screen.getByText('칸의 너비는 단계별 금액, 아래 막대는 그중 예상 매출의 비율이에요.'),
    ).toBeInTheDocument()
  })
})
