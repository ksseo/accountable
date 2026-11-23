import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ConfirmDelete } from './ConfirmDelete'

// Read as text: Vitest hands CSS imports over as modules, not their source.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const buttonCss = read('./Button.module.css')
const tokens = read('../styles/tokens.css')

function setup(message: string | null = '‘한빛정밀’을 삭제할까요?') {
  const onConfirm = vi.fn(() => Promise.resolve())
  const onOpenChange = vi.fn()
  render(<ConfirmDelete isOpen message={message} onConfirm={onConfirm} onOpenChange={onOpenChange} />)
  return { onConfirm, onOpenChange }
}

describe('ConfirmDelete', () => {
  it('starts with focus on 취소', () => {
    setup()
    expect(screen.getByRole('button', { name: '취소' })).toHaveFocus()
  })

  it('is an alert dialog with the message it is given', () => {
    setup('연락처 3명과 영업 기회 2건은 그대로 남아요.')
    const dialog = screen.getByRole('alertdialog', { name: '삭제' })
    expect(dialog).toHaveTextContent('연락처 3명과 영업 기회 2건은 그대로 남아요.')
  })

  it('has a delete button in Raspberry ink with white text', () => {
    setup()
    expect(screen.getByRole('button', { name: '삭제' })).toHaveAttribute('data-variant', 'danger')
    const danger = /\.danger \{([^}]*)\}/.exec(buttonCss)?.[1] ?? ''
    expect(danger).toContain('background: var(--raspberry-ink)')
    expect(danger).toContain('color: #fff')
    expect(tokens).toContain('--raspberry-ink: #c2244c')
  })

  it('deletes on 삭제 and closes', async () => {
    const { onConfirm, onOpenChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does nothing on 취소', async () => {
    const { onConfirm, onOpenChange } = setup()
    await userEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('waits for the counts before deleting', () => {
    setup(null)
    expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled()
  })
})
