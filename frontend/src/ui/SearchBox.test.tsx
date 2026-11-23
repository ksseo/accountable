import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchBox } from './SearchBox'

function setup() {
  const onSearch = vi.fn()
  render(<SearchBox label="거래처 검색" placeholder="검색" value="" onSearch={onSearch} />)
  return { onSearch, input: screen.getByRole('searchbox', { name: '거래처 검색' }) as HTMLInputElement }
}

describe('SearchBox', () => {
  it('searches as Latin letters are typed', async () => {
    const { onSearch, input } = setup()
    await userEvent.type(input, 'abc')
    expect(onSearch).toHaveBeenLastCalledWith('abc')
    expect(onSearch).toHaveBeenCalledTimes(3)
  })

  it('does not search while a Korean letter is being typed', () => {
    const { onSearch, input } = setup()
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'ㅎ' } })
    fireEvent.change(input, { target: { value: '하' } })
    fireEvent.change(input, { target: { value: '한' } })
    expect(onSearch).not.toHaveBeenCalled()
    expect(input.value).toBe('한')
  })

  it('searches once the letter is finished', () => {
    const { onSearch, input } = setup()
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '한' } })
    fireEvent.compositionEnd(input, { data: '한' })
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('한')
  })

  it('clears with its button', async () => {
    const onSearch = vi.fn()
    render(<SearchBox label="거래처 검색" value="한빛" onSearch={onSearch} />)
    await userEvent.click(screen.getByRole('button', { name: '검색어 지우기' }))
    expect(onSearch).toHaveBeenLastCalledWith('')
  })
})
