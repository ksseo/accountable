import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ChartPanel } from './ChartPanel'

function setup() {
  render(
    <ChartPanel
      title="월별 수주 금액"
      summary="최근 12개월 수주 금액은 모두 $813,500이에요. 가장 많은 달은 2026년 8월 $97,500이에요."
      table={{
        columns: ['월', '수주 금액'],
        rows: [
          ['2026년 10월', '$78,000'],
          ['11월', '$92,000'],
        ],
      }}
    >
      <svg data-testid="chart" />
    </ChartPanel>,
  )
}

describe('ChartPanel', () => {
  it('gives the chart a text summary', () => {
    setup()
    const summary = screen.getByText(/최근 12개월 수주 금액은 모두 \$813,500이에요/)
    expect(summary).toHaveClass('sr-only')
    expect(screen.getByRole('heading', { name: '월별 수주 금액' }).closest('section')).toHaveAttribute('aria-describedby', summary.id)
  })

  it('shows the figures as a table with 표로 보기, and the chart again after', async () => {
    const user = userEvent.setup()
    setup()
    const toggle = screen.getByRole('button', { name: '표로 보기' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('table')).toBeNull()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('chart')).toBeNull()
    const table = screen.getByRole('table', { name: '월별 수주 금액' })
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['월', '수주 금액'])
    expect(within(table).getByRole('rowheader', { name: '11월' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: '$92,000' })).toBeInTheDocument()

    await user.click(toggle)
    expect(screen.getByTestId('chart')).toBeInTheDocument()
  })
})
