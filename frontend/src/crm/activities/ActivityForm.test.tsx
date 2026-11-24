import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithApp } from '../../test/render'
import { ActivityForm } from './ActivityForm'
import type { TimelineEntry } from './api'

const MINUTE = 60_000
const OPENED = new Date(2026, 10, 23, 11, 5, 40)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'], now: OPENED })
})

afterEach(() => {
  vi.useRealTimers()
})

function setup(props: Partial<Parameters<typeof ActivityForm>[0]> = {}) {
  const onSave = vi.fn((_values: { occurred_at?: string }) => Promise.resolve())
  const view = renderWithApp(<ActivityForm mode="log" onSave={onSave} {...props} />)
  const when = within(screen.getByRole('group', { name: /^언제/ }))
  const time = () => ['시', '분'].map((unit) => when.getByRole('spinbutton', { name: new RegExp(`^${unit}`) }).textContent)
  const write = async (text: string) => {
    await view.user.type(screen.getByRole('textbox', { name: '내용 (필수)' }), text)
  }
  const save = () => view.user.click(screen.getByRole('button', { name: /^(기록|저장)$/ }))
  const sent = () => onSave.mock.lastCall![0]
  return { ...view, when, time, write, save, sent }
}

const later = (minutes: number) => act(async () => void (await vi.advanceTimersByTimeAsync(minutes * MINUTE)))

describe('ActivityForm', () => {
  it('leaves the time out unless it is changed, so it is when the activity is saved (REC-5)', async () => {
    const { write, save, sent } = setup()
    await later(90)
    await write('90분 뒤에 남긴 메모')
    await save()
    expect(sent().occurred_at).toBeUndefined()
  })

  it('shows the time now, and keeps it current until it is changed', async () => {
    const { user, when, time } = setup()
    expect(time()).toEqual(['11', '05'])
    await later(50)
    expect(time()).toEqual(['11', '55'])

    when.getByRole('spinbutton', { name: /^시/ }).focus()
    await user.keyboard('{ArrowDown}')
    await later(30)
    expect(time()).toEqual(['10', '55'])
  })

  it('sends a time that was changed', async () => {
    const { user, when, write, save, sent } = setup()
    when.getByRole('spinbutton', { name: /^시/ }).focus()
    await user.keyboard('{ArrowDown}')
    await write('한 시간 전 통화')
    await save()
    expect(sent().occurred_at).toBe(new Date(2026, 10, 23, 10, 5).toISOString())
  })

  it('keeps a time that was changed and then set back to what it was', async () => {
    const { user, when, time, write, save, sent } = setup()
    when.getByRole('spinbutton', { name: /^시/ }).focus()
    await user.keyboard('{ArrowDown}')
    await later(30)
    await user.keyboard('{ArrowUp}')
    await later(5)
    expect(time()).toEqual(['11', '05'])
    await write('11시 5분 통화')
    await save()
    expect(sent().occurred_at).toBe(new Date(2026, 10, 23, 11, 5).toISOString())
  })

  it('starts again from now after saving', async () => {
    const { user, when, time, write, save, sent } = setup()
    when.getByRole('spinbutton', { name: /^시/ }).focus()
    await user.keyboard('{ArrowDown}')
    await write('한 시간 전 통화')
    await save()
    await later(10)
    expect(time()).toEqual(['11', '15'])
    await write('방금 남긴 메모')
    await save()
    expect(sent().occurred_at).toBeUndefined()
  })

  it('keeps the saved time, with its seconds, when another field is edited (REC-6)', async () => {
    const initial = {
      id: 1,
      kind: 'note',
      description: '견적 요청',
      occurred_at: '2026-11-20T01:02:33.456Z',
      follow_up_date: null,
      follow_up_done: false,
    } as TimelineEntry
    const { write, save, sent } = setup({ mode: 'edit', initial })
    await later(5)
    await write(' 다시 확인')
    await save()
    expect(sent().occurred_at).toBe('2026-11-20T01:02:33.456Z')
  })
})
