import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithApp } from '../../test/render'
import type { FunnelStage } from './api'
import { Funnel, FUNNEL_MIN_WIDTH } from './Funnel'
import { funnelWidths } from './widths'

const FUNNEL: FunnelStage[] = [
  { stage: 'new', value: 3_590_800, count: 80, share: 1 },
  { stage: 'qualified', value: 3_318_800, count: 68, share: 0.9243 },
  { stage: 'proposal', value: 2_865_500, count: 55, share: 0.798 },
  { stage: 'negotiation', value: 2_130_000, count: 41, share: 0.5932 },
  { stage: 'won', value: 120_000, count: 3, share: 0.0334 },
]

const widthOf = (stage: string) => Number(document.querySelector(`[data-stage="${stage}"]`)!.getAttribute('data-width'))

describe('funnelWidths', () => {
  it('follows value against the largest, with a minimum', () => {
    expect(funnelWidths([400, 200, 4], 0.28)).toEqual([1, 0.5, 0.28])
  })

  it('draws every segment at the minimum when nothing reached New', () => {
    expect(funnelWidths([0, 0], 0.28)).toEqual([0.28, 0.28])
  })
})

describe('Funnel', () => {
  it('narrows with value, keeping a small Won wide enough for its name', () => {
    renderWithApp(<Funnel funnel={FUNNEL} conversion={0.0334} />)
    expect(widthOf('new')).toBe(300)
    expect(widthOf('negotiation') / widthOf('new')).toBeCloseTo(2_130_000 / 3_590_800, 2)
    expect(widthOf('won')).toBeCloseTo(300 * FUNNEL_MIN_WIDTH)
  })

  it('shows each stage’s name, value, count and share of New, and the conversion rate', () => {
    renderWithApp(<Funnel funnel={FUNNEL} conversion={0.0334} />)
    const negotiation = document.querySelector('[data-stage="negotiation"]') as SVGGElement
    expect(negotiation).toHaveTextContent('협상')
    expect(negotiation).toHaveTextContent('$2,130,000')
    expect(negotiation).toHaveTextContent('41건, 신규의 59%')
    expect(screen.getByText(/신규 → 수주 전환율 \(금액 기준\)/)).toHaveTextContent('3%')
  })

  it('has a summary and a table of the same figures', async () => {
    const { user } = renderWithApp(<Funnel funnel={FUNNEL} conversion={0.0334} />)
    expect(screen.getByText(/최근 12개월 영업 퍼널: 신규 \$3,590,800 \(80건\)/)).toHaveClass('sr-only')
    await user.click(screen.getByRole('button', { name: '표로 보기' }))
    const row = within(screen.getByRole('table', { name: '영업 퍼널' })).getByRole('row', { name: /수주/ })
    expect(row).toHaveTextContent('수주$120,0003건3%')
  })
})
