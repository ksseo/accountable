import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithApp } from '../../test/render'
import { Timeline } from './Timeline'

const EMPTY = '아직 기록된 활동이 없어요'

const answer = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const PAGE = { items: [], total: 0, offset: 0, limit: 50 }

afterEach(() => vi.unstubAllGlobals())

describe('Timeline', () => {
  it('says it could not be loaded, not that there is nothing, and tries again', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(answer(500, {})).mockResolvedValueOnce(answer(200, PAGE))
    vi.stubGlobal('fetch', fetch)
    const { user } = renderWithApp(<Timeline owner={{ kind: 'contact', id: 1 }} />)

    expect(await screen.findByText('불러오지 못했어요')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText(EMPTY)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
