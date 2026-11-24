import { onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import { queryClient } from './queryClient'

afterEach(() => {
  onlineManager.setOnline(true)
  queryClient.clear()
})

describe('queryClient', () => {
  it('fetches while the computer has no internet, since the backend is on it (APP-4)', async () => {
    onlineManager.setOnline(false)
    await expect(queryClient.fetchQuery({ queryKey: ['here'], queryFn: async () => 'loaded' })).resolves.toBe('loaded')
  }, 1000)

  it.each([404, 422])('does not ask again after a %i', async (status) => {
    const queryFn = vi.fn(() => Promise.reject(new ApiError(status, 'no')))
    const retry = queryClient.getDefaultOptions().queries!.retry as (count: number, error: Error) => boolean
    await expect(queryClient.fetchQuery({ queryKey: ['missing'], queryFn, retry })).rejects.toThrow('no')
    expect(queryFn).toHaveBeenCalledTimes(1)
  })
})
