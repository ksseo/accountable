// The dark mode toggle in the top bar (UI-9, A11Y-1, A11Y-3).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ModeToggle } from './ModeToggle'

const root = document.documentElement

beforeEach(() => {
  root.removeAttribute('data-mode')
  localStorage.clear()
})

function setup() {
  render(<ModeToggle />)
  return { toggle: screen.getByRole('button', { name: '다크 모드' }), user: userEvent.setup() }
}

describe('ModeToggle', () => {
  it('is not pressed in light mode, and shows a moon', () => {
    const { toggle } = setup()
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle.querySelector('svg')).toHaveClass('lucide-moon')
  })

  it('is pressed in dark mode, and shows a sun', () => {
    root.setAttribute('data-mode', 'dark')
    const { toggle } = setup()
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle.querySelector('svg')).toHaveClass('lucide-sun')
  })

  it('switches when clicked, and back', async () => {
    const { toggle, user } = setup()
    await user.click(toggle)
    expect(root).toHaveAttribute('data-mode', 'dark')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await user.click(toggle)
    expect(root).not.toHaveAttribute('data-mode', 'dark')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it.each(['[Space]', '[Enter]'])('is reached with Tab and pressed with %s', async (key) => {
    const { toggle, user } = setup()
    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard(key)
    expect(root).toHaveAttribute('data-mode', 'dark')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })
})
