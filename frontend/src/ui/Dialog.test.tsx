import { act, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { renderWithApp } from '../test/render'
import { Button } from './Button'
import { Dialog, useUnsaved } from './Dialog'

function NameForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState('')
  useUnsaved(name !== '')
  return (
    <>
      <input aria-label="이름" value={name} onChange={(event) => setName(event.target.value)} />
      <Button onPress={onSave}>저장</Button>
    </>
  )
}

/** A form in a dialog. `save` stands for a save that finishes by itself. */
function Example({ onReady }: { onReady?: (save: () => void) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  onReady?.(() => setIsOpen(false))
  return (
    <>
      <Button onPress={() => setIsOpen(true)}>연락처 추가</Button>
      <Dialog title="새 연락처" isOpen={isOpen} onOpenChange={setIsOpen}>
        <NameForm onSave={() => setIsOpen(false)} />
      </Dialog>
    </>
  )
}

async function setup() {
  let save = () => {}
  const view = renderWithApp(<Example onReady={(close) => (save = close)} />)
  const open = () => view.user.click(screen.getByRole('button', { name: '연락처 추가' }))
  await open()
  return { ...view, open, save: () => save() }
}

const field = () => screen.getByRole('textbox', { name: '이름' })
const question = () => screen.queryByRole('alertdialog', { name: '저장하지 않고 닫을까요?' })
const form = () => screen.queryByRole('dialog', { name: '새 연락처', hidden: true })

describe('Dialog', () => {
  it('keeps what was typed when the page behind it is clicked (FORM-1)', async () => {
    const { user } = await setup()
    await user.type(field(), '입력하던 이름')
    await user.click(document.querySelector('.overlay')!)
    expect(field()).toHaveValue('입력하던 이름')
    expect(question()).not.toBeInTheDocument()
  })

  it('closes at once on Escape when nothing would be lost', async () => {
    const { user } = await setup()
    await user.keyboard('{Escape}')
    expect(question()).not.toBeInTheDocument()
    expect(form()).not.toBeInTheDocument()
  })

  it('closes at once on 닫기, which is chosen', async () => {
    const { user } = await setup()
    await user.type(field(), '입력하던 이름')
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(question()).not.toBeInTheDocument()
    expect(form()).not.toBeInTheDocument()
  })

  it.each([
    ['계속 입력', '{Enter}'],
    ['Escape again', '{Escape}'],
  ])('asks on Escape when something was typed, and goes back to it on %s', async (_how, key) => {
    const { user } = await setup()
    await user.type(field(), '입력하던 이름')
    await user.keyboard('{Escape}')
    expect(question()).toHaveTextContent('입력한 내용이 사라져요.')
    expect(screen.getByRole('button', { name: '계속 입력' })).toHaveFocus()

    await user.keyboard(key)
    expect(question()).not.toBeInTheDocument()
    expect(field()).toHaveValue('입력하던 이름')
  })

  it('closes on 버리기', async () => {
    const { user, open } = await setup()
    await user.type(field(), '입력하던 이름')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: '버리기' }))
    expect(question()).not.toBeInTheDocument()
    expect(form()).not.toBeInTheDocument()

    // Opened again, it's empty, and Escape has nothing to ask about.
    await open()
    expect(field()).toHaveValue('')
    await user.keyboard('{Escape}')
    expect(form()).not.toBeInTheDocument()
  })

  it('stops asking once a save has closed it', async () => {
    const { user, open, save } = await setup()
    await user.type(field(), '입력하던 이름')
    await user.keyboard('{Escape}')
    expect(question()).toBeInTheDocument()

    act(() => save())
    expect(question()).not.toBeInTheDocument()
    expect(form()).not.toBeInTheDocument()
    await open()
    expect(question()).not.toBeInTheDocument()
    expect(form()).toBeInTheDocument()
  })
})
