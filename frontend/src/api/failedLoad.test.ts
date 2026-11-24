import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import { failedLoad } from './failedLoad'

const load = (data: unknown, error: unknown = null) => ({ data, error, refetch: vi.fn() })
const broken = new ApiError(500, 'broken')

describe('failedLoad', () => {
  it('is nothing while loading, once loaded, or while the backend is down', () => {
    expect(failedLoad(load(undefined))).toBeUndefined()
    expect(failedLoad(load([]))).toBeUndefined()
    expect(failedLoad(load(undefined, new ApiError(0, 'offline')))).toBeUndefined()
  })

  it('is nothing when loading again failed, since the data is still there', () => {
    expect(failedLoad(load([1], broken))).toBeUndefined()
  })

  it('tries again only what failed', () => {
    const [good, bad] = [load([]), load(undefined, broken)]
    failedLoad(good, bad)!()
    expect(bad.refetch).toHaveBeenCalledOnce()
    expect(good.refetch).not.toHaveBeenCalled()
  })
})
