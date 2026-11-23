import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { META, renderWithApp } from '../../test/render'
import type { Deal } from './api'
import { DealForm } from './DealForm'
import { dealDeleteMessage } from './deleteMessage'

const CONTACTS = [
  { id: 10, name: '박서연', detail: '한빛정밀', organization_id: 1 },
  { id: 11, name: 'Sarah Kim', detail: null, organization_id: null },
]
const ORGANIZATIONS = [
  { id: 1, name: '한빛정밀', detail: '제조' },
  { id: 2, name: '대성기계공업', detail: '제조' },
]

function setup(props: { initial?: Deal } = {}) {
  const onSave = vi.fn(() => Promise.resolve())
  const view = renderWithApp(
    <DealForm meta={META} contacts={CONTACTS} organizations={ORGANIZATIONS} onSave={onSave} onCancel={vi.fn()} {...props} />,
  )
  const field = (name: string) => screen.getByRole('textbox', { name })
  return { ...view, onSave, field }
}

async function chooseStage(user: ReturnType<typeof setup>['user'], label: string) {
  await user.click(screen.getByRole('button', { name: /단계/ }))
  await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: label }))
}

describe('DealForm', () => {
  it('labels every field and marks the required ones', () => {
    const { field } = setup()
    expect(field('이름 (필수)')).toBeInTheDocument()
    expect(field('금액 (필수)')).toBeInTheDocument()
    expect(field('확률')).toHaveValue('10')
    expect(screen.getByRole('group', { name: '마감일' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '주 연락처' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '거래처' })).toBeInTheDocument()
  })

  it('says what is wrong when fields are left, and focuses the first on save', async () => {
    const { user, field, onSave } = setup()
    await user.type(field('금액 (필수)'), '많이')
    await user.tab()
    expect(screen.getByText('금액은 숫자로 입력해 주세요. 예: 12,500')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(screen.getByText('이름을 입력해 주세요')).toBeInTheDocument()
    expect(field('이름 (필수)')).toHaveFocus()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows the amount as dollars once the field is left', async () => {
    const { user, field } = setup()
    await user.type(field('금액 (필수)'), '12500')
    await user.tab()
    expect(field('금액 (필수)')).toHaveValue('$12,500')
  })

  it('fills in the organization from the contact when it is empty', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('combobox', { name: '주 연락처' }), '박서')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByRole('combobox', { name: '거래처' })).toHaveValue('한빛정밀')
  })

  it('keeps an organization already chosen', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('combobox', { name: '거래처' }), '대성')
    await user.keyboard('{ArrowDown}{Enter}')
    await user.type(screen.getByRole('combobox', { name: '주 연락처' }), '박서')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByRole('combobox', { name: '거래처' })).toHaveValue('대성기계공업')
  })

  it('fills in the probability from the stage, and today for Won or Lost', async () => {
    const { user, field } = setup()
    await chooseStage(user, '협상')
    expect(field('확률')).toHaveValue('75')
    await chooseStage(user, '수주')
    expect(field('확률')).toHaveValue('100')
    const closeDate = screen.getByRole('group', { name: '마감일' })
    expect(within(closeDate).getByRole('spinbutton', { name: /^년/ })).toHaveTextContent('2026')
    expect(within(closeDate).getByRole('spinbutton', { name: /^월/ })).toHaveTextContent('11')
    expect(within(closeDate).getByRole('spinbutton', { name: /^일/ })).toHaveTextContent('23')
  })

  it('lets the filled-in probability be changed before saving', async () => {
    const { user, field, onSave } = setup()
    await user.type(field('이름 (필수)'), '2027 포장재 공급')
    await user.type(field('금액 (필수)'), '$120,000')
    await chooseStage(user, '제안')
    await user.clear(field('확률'))
    await user.type(field('확률'), '40')
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(onSave).toHaveBeenCalledWith({
      name: '2027 포장재 공급',
      value: 120_000,
      stage: 'proposal',
      probability: 40,
      close_date: null,
      contact_id: null,
      organization_id: null,
    })
  })

  it('checks the probability range', async () => {
    const { user, field } = setup()
    await user.clear(field('확률'))
    await user.type(field('확률'), '120')
    await user.tab()
    expect(screen.getByText('확률은 0에서 100 사이의 숫자로 입력해 주세요')).toBeInTheDocument()
  })

  it('does not submit on Enter while a Korean letter is being typed', async () => {
    const { user, field, onSave } = setup()
    await user.type(field('이름 (필수)'), '포장')
    await user.type(field('금액 (필수)'), '100')
    const composing = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })
    fireEvent(field('이름 (필수)'), composing)
    expect(composing.defaultPrevented).toBe(true)
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('dealDeleteMessage', () => {
  it('says its activities go with it, stage changes included', () => {
    expect(dealDeleteMessage('2027 포장재 공급', { activities: 7 })).toBe(
      '‘2027 포장재 공급’을 삭제할까요? 이 영업 기회에 기록된 활동 7건(단계 변경 기록 포함)이 함께 삭제돼요.',
    )
  })

  it('just asks when there are none', () => {
    expect(dealDeleteMessage('Packaging line upgrade', { activities: 0 })).toBe('‘Packaging line upgrade’을(를) 삭제할까요?')
  })
})
