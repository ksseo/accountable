// Light and dark mode: what it is, switching it and keeping it (UI-9).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mode } from './mode'

const root = document.documentElement
const kept = () => localStorage.getItem('accountable.mode')

beforeEach(() => {
  root.removeAttribute('data-mode')
  localStorage.clear()
})

afterEach(() => vi.restoreAllMocks())

describe('mode', () => {
  it('is light unless the page says dark', () => {
    expect(mode.isDark()).toBe(false)
    root.setAttribute('data-mode', 'dark')
    expect(mode.isDark()).toBe(true)
    root.setAttribute('data-mode', 'something else')
    expect(mode.isDark()).toBe(false)
  })

  it('changes the page and what is kept', () => {
    mode.setDark(true)
    expect(root).toHaveAttribute('data-mode', 'dark')
    expect(kept()).toBe('dark')

    mode.setDark(false)
    expect(root).not.toHaveAttribute('data-mode', 'dark')
    expect(kept()).toBe('light')
  })

  it('still switches when the browser will not keep it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    })
    mode.setDark(true)
    expect(mode.isDark()).toBe(true)
    mode.setDark(false)
    expect(mode.isDark()).toBe(false)
  })

  it('tells whoever listens, until they stop', () => {
    const listener = vi.fn()
    const stop = mode.subscribe(listener)
    mode.setDark(true)
    expect(listener).toHaveBeenCalledOnce()
    stop()
    mode.setDark(false)
    expect(listener).toHaveBeenCalledOnce()
  })
})
