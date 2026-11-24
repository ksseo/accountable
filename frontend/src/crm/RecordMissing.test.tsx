import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { renderWithApp } from '../test/render'
import { RecordPending } from './RecordMissing'

function setup(error: unknown) {
  const onRetry = vi.fn()
  const view = renderWithApp(
    <RecordPending error={error} listPath="/deals" listLabel="영업 기회" onRetry={onRetry} />,
  )
  return { ...view, onRetry }
}

describe('RecordPending', () => {
  it.each([
    [404, 'a record that was deleted'],
    [422, 'an address such as /deals/abc'],
  ])('says it is not there on a %i, %s', (status) => {
    setup(new ApiError(status, 'no'))
    expect(screen.getByRole('heading', { level: 1, name: '찾을 수 없어요' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '영업 기회 목록' })).toHaveAttribute('href', '/deals')
  })

  it('says it could not be loaded on any other answer, and tries again', async () => {
    const { user, onRetry } = setup(new ApiError(500, 'broken'))
    expect(screen.getByRole('heading', { level: 1, name: '영업 기회' })).toBeInTheDocument()
    expect(screen.getByText('불러오지 못했어요')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['while it loads', null],
    ['while the backend is down, since the page retries by itself (UI-5)', new ApiError(0, 'offline')],
  ])('shows its shape %s', (_when, error) => {
    setup(error)
    expect(screen.queryByText('불러오지 못했어요')).not.toBeInTheDocument()
    expect(screen.queryByText('찾을 수 없어요')).not.toBeInTheDocument()
  })
})
