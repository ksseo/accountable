import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { META, renderWithApp } from '../../test/render'
import { ContactForm } from './ContactForm'
import { contactDeleteMessage } from './deleteMessage'

const ORGANIZATIONS = [
  { id: 1, name: '한빛정밀', detail: '제조' },
  { id: 2, name: '대성기계공업', detail: '제조' },
  { id: 3, name: 'Pacific Foods', detail: '식품' },
]

function setup() {
  const onSave = vi.fn(() => Promise.resolve())
  const view = renderWithApp(<ContactForm meta={META} organizations={ORGANIZATIONS} onSave={onSave} onCancel={vi.fn()} />)
  return { ...view, onSave, name: screen.getByRole('textbox', { name: '이름 (필수)' }) }
}

describe('ContactForm', () => {
  it('labels every field and marks the required one', () => {
    setup()
    for (const label of ['이메일', '전화번호', '직책']) {
      expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('combobox', { name: '거래처' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /상태/ })).toHaveTextContent('리드')
    expect(screen.queryByText('이메일 (필수)')).not.toBeInTheDocument()
  })

  it('checks the email when the field is left', async () => {
    const { user } = setup()
    const email = screen.getByRole('textbox', { name: '이메일' })
    await user.type(email, 'minjun@')
    await user.tab()
    expect(screen.getByText('올바른 이메일 주소가 아니에요')).toBeInTheDocument()
    await user.type(email, 'hanbit.example')
    expect(screen.queryByText('올바른 이메일 주소가 아니에요')).not.toBeInTheDocument()
  })

  it('moves focus to the first wrong field on save', async () => {
    const { user, name, onSave } = setup()
    await user.type(name, '김민준')
    await user.type(screen.getByRole('textbox', { name: '이메일' }), 'nope')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: '이메일' })).toHaveFocus()
  })

  it('picks an organization by keyboard, and new contacts are leads', async () => {
    const { user, name, onSave } = setup()
    await user.type(name, '김민준')
    await user.type(screen.getByRole('combobox', { name: '거래처' }), '대성')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByRole('combobox', { name: '거래처' })).toHaveValue('대성기계공업')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({
      name: '김민준',
      email: null,
      phone: null,
      job_title: null,
      organization_id: 2,
      status: 'lead',
    })
  })

  it('does not submit on Enter while a Korean letter is being typed', async () => {
    const { user, name, onSave } = setup()
    await user.type(name, '김민')
    const composing = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true })
    fireEvent(name, composing)
    expect(composing.defaultPrevented).toBe(true)
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('contactDeleteMessage', () => {
  it('says the deals stay and the activities go, with their counts', () => {
    expect(contactDeleteMessage('김민준', { deals: 2, activities: 5 })).toBe(
      '‘김민준’ 님을 삭제할까요? 영업 기회 2건은 그대로 남고 주 연락처가 비워져요. 이 연락처에 기록된 활동 5건은 함께 삭제돼요.',
    )
  })

  it('leaves out what has none', () => {
    expect(contactDeleteMessage('Sarah Kim', { deals: 0, activities: 0 })).toBe('‘Sarah Kim’ 님을 삭제할까요?')
  })
})
