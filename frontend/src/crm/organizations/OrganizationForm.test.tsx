import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client'
import { renderWithApp } from '../../test/render'
import { organizationDeleteMessage } from './deleteMessage'
import { OrganizationForm } from './OrganizationForm'

function setup(onSave = vi.fn(() => Promise.resolve())) {
  const view = renderWithApp(
    <OrganizationForm industries={['제조', '물류']} onSave={onSave} onCancel={vi.fn()} />,
  )
  return { ...view, onSave, name: screen.getByRole('textbox', { name: '이름 (필수)' }) }
}

describe('OrganizationForm', () => {
  it('labels every field and marks the required one', () => {
    setup()
    expect(screen.getByRole('textbox', { name: '이름 (필수)' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '업종' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '웹사이트' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '비고' })).toBeInTheDocument()
  })

  it('says what is wrong in Korean as soon as a field is left', async () => {
    const { user, name } = setup()
    await user.click(name)
    await user.tab()
    expect(screen.getByText('이름을 입력해 주세요')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription('이름을 입력해 주세요')
  })

  it('moves focus to the first wrong field on save', async () => {
    const { user, name, onSave } = setup()
    await user.click(screen.getByRole('textbox', { name: '비고' }))
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(name).toHaveFocus()
  })

  it('sends trimmed text, with empty fields as null', async () => {
    const { user, name, onSave } = setup()
    await user.type(name, '  한빛정밀  ')
    await user.type(screen.getByRole('textbox', { name: '웹사이트' }), 'hanbit.example')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({
      name: '한빛정밀',
      industry: null,
      website: 'hanbit.example',
      notes: null,
    })
  })

  it('does not submit on Enter while a Korean letter is being typed', async () => {
    const { user, name, onSave } = setup()
    await user.type(name, '한빛')
    const composing = new KeyboardEvent('keydown', {
      key: 'Enter',
      isComposing: true,
      bubbles: true,
      cancelable: true,
    })
    fireEvent(name, composing)
    expect(composing.defaultPrevented).toBe(true)
    expect(onSave).not.toHaveBeenCalled()

    await user.keyboard('{Enter}')
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('shows the backend’s field errors under the field', async () => {
    const onSave = vi.fn(() => Promise.reject(new ApiError(422, 'bad', { name: 'string_too_long' })))
    const { user, name } = setup(onSave)
    await user.type(name, '한빛정밀')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(await screen.findByText('너무 길어요')).toBeInTheDocument()
    expect(name).toHaveFocus()
  })
})

describe('organizationDeleteMessage', () => {
  it('says the contacts and deals stay, with their counts', () => {
    expect(organizationDeleteMessage('한빛정밀', { contacts: 3, deals: 2 })).toBe(
      '‘한빛정밀’을 삭제할까요? 연락처 3명과 영업 기회 2건은 그대로 남고, 거래처 연결만 해제돼요.',
    )
  })

  it('writes both particles for a name it cannot read', () => {
    expect(organizationDeleteMessage('Pacific Foods', { contacts: 0, deals: 1 })).toBe(
      '‘Pacific Foods’을(를) 삭제할까요? 영업 기회 1건은 그대로 남고, 거래처 연결만 해제돼요.',
    )
  })

  it('says so when nothing is linked', () => {
    expect(organizationDeleteMessage('대성기계', { contacts: 0, deals: 0 })).toBe(
      '‘대성기계’를 삭제할까요? 연결된 연락처와 영업 기회는 없어요.',
    )
  })
})
