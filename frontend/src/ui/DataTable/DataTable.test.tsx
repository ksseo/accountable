import { act, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithApp, searchOf } from '../../test/render'
import { DataTable, type Column } from './DataTable'
import type { CellValue, SortDirection } from './sort'

type Row = { id: number; name: string; phone: string | null }

// 120 rows: 품목 001 to 품목 120, every tenth without a phone number.
const ROWS: Row[] = Array.from({ length: 120 }, (_, index) => ({
  id: index + 1,
  name: `품목 ${String(index + 1).padStart(3, '0')}`,
  phone: index % 10 === 0 ? null : `010-0000-${String(index + 1).padStart(4, '0')}`,
}))

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: '이름', value: (row) => row.name, searchable: true, cell: (row) => row.name },
  { key: 'phone', header: '전화번호', value: (row) => row.phone, searchable: true, cell: (row) => row.phone },
]

function table(rows: Row[] | undefined, path = '/items', onRetry?: () => void) {
  return renderWithApp(
    <DataTable
      caption="품목 목록"
      rows={rows}
      onRetry={onRetry}
      totalCount={rows?.length ?? 0}
      columns={COLUMNS}
      rowKey={(row) => row.id}
      rowHref={(row) => `/items/${row.id}`}
      rowName={(row) => row.name}
      searchLabel="품목 검색"
      searchPlaceholder="검색"
      defaultSort={{ key: 'name', direction: 'asc' }}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      empty={{ message: '아직 품목이 없어요' }}
    />,
    { path },
  )
}

const bodyRows = () => within(screen.getByRole('table', { name: '품목 목록' })).getAllByRole('row').slice(1)
const firstCell = (row: HTMLElement) => within(row).getAllByRole('cell')[0].textContent

describe('DataTable', () => {
  it('shows 50 rows a page', () => {
    table(ROWS)
    expect(bodyRows()).toHaveLength(50)
    expect(screen.getByText('1–50 / 120')).toBeInTheDocument()
  })

  it('marks the sorted column with aria-sort and reverses it on a second click', async () => {
    const { user, router } = table(ROWS)
    const nameHeader = screen.getByRole('columnheader', { name: /이름/ })
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByRole('columnheader', { name: /전화번호/ })).toHaveAttribute('aria-sort', 'none')

    await user.click(within(nameHeader).getByRole('button'))
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
    expect(firstCell(bodyRows()[0])).toBe('품목 120')
    expect(searchOf(router)).toMatchObject({ sort: 'name', dir: 'desc' })
  })

  it('keeps empty values last when sorting', async () => {
    const { user } = table(ROWS, '/items?sort=phone&dir=desc&page=3')
    const rows = bodyRows()
    expect(rows).toHaveLength(20)
    expect(within(rows[rows.length - 1]).getAllByRole('cell')[1].textContent).toBe('')
    await user.click(within(screen.getByRole('columnheader', { name: /전화번호/ })).getByRole('button'))
    // Sorting starts again at the first page.
    expect(within(bodyRows()[0]).getAllByRole('cell')[1].textContent).toBe('010-0000-0002')
  })

  it('pages, and keeps the page in the address', async () => {
    const { user, router } = table(ROWS)
    await user.click(screen.getByRole('button', { name: /다음/ }))
    expect(firstCell(bodyRows()[0])).toBe('품목 051')
    expect(searchOf(router)).toMatchObject({ page: '2' })
    expect(screen.getByText('2 / 3쪽')).toBeInTheDocument()
  })

  it('searches as you type, and keeps the search in the address', async () => {
    const { user, router } = table(ROWS, '/items?page=2')
    await user.type(screen.getByRole('searchbox', { name: '품목 검색' }), '0000-0117')
    expect(bodyRows().map(firstCell)).toEqual(['품목 117'])
    expect(searchOf(router)).toEqual({ q: '0000-0117' })
  })

  it('reads search, sort and page from the address', () => {
    table(ROWS, '/items?q=%ED%92%88%EB%AA%A9%2001&sort=name&dir=desc')
    expect(screen.getByRole('searchbox', { name: '품목 검색' })).toHaveValue('품목 01')
    expect(bodyRows().map(firstCell)).toEqual(['품목 019', '품목 018', '품목 017', '품목 016', '품목 015', '품목 014', '품목 013', '품목 012', '품목 011', '품목 010'])
  })

  it('says when a search finds nothing', () => {
    table(ROWS, '/items?q=%ED%95%9C%EB%B9%9B')
    expect(screen.getByText('‘한빛’과 일치하는 결과가 없어요')).toBeInTheDocument()
  })

  it('says when there is nothing yet', () => {
    table([])
    expect(screen.getByText('아직 품목이 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows shapes while loading', () => {
    table(undefined)
    expect(screen.getByRole('status', { name: '불러오는 중' })).toBeInTheDocument()
  })

  it('opens a row on click', async () => {
    const { user, router } = table(ROWS)
    await user.click(within(bodyRows()[2]).getAllByRole('cell')[1])
    expect(router.state.location.pathname).toBe('/items/3')
  })

  it('has a menu on each row with 수정 and 삭제', async () => {
    const { user } = table(ROWS)
    await user.click(screen.getByRole('button', { name: '품목 001 메뉴' }))
    const menu = screen.getByRole('menu')
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['수정', '삭제'])
  })

  it('says when its rows could not be loaded, and tries again', async () => {
    const onRetry = vi.fn()
    const { user } = table(undefined, '/items', onRetry)
    expect(screen.getByText('불러오지 못했어요')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

type Item = { id: number; value: CellValue; note?: string }

const ITEM_COLUMNS: Column<Item>[] = [
  { key: 'id', header: '번호', value: (row) => row.id, cell: (row) => row.id },
  { key: 'value', header: '값', value: (row) => row.value, searchable: true, cell: (row) => row.value },
  { key: 'note', header: '메모', value: (row) => row.note, searchable: true, cell: (row) => row.note },
  { key: 'plain', header: '고정', cell: () => '-' },
]

function ItemTable({ items }: { items: Item[] }) {
  return (
    <DataTable
      caption="품목 목록"
      rows={items}
      totalCount={items.length}
      columns={ITEM_COLUMNS}
      rowKey={(row) => row.id}
      rowHref={(row) => `/items/${row.id}`}
      rowName={(row) => `품목 ${row.id}`}
      searchLabel="품목 검색"
      searchPlaceholder="검색"
      defaultSort={{ key: 'id', direction: 'asc' }}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      empty={{ message: '아직 품목이 없어요' }}
    />
  )
}

/** Items 1, 2, 3 and so on, each with one of the values. */
const itemsOf = (values: CellValue[]): Item[] => values.map((value, index) => ({ id: index + 1, value }))
const shownIds = () => bodyRows().map((row) => Number(firstCell(row)))

describe('DataTable sorting (TBL-3)', () => {
  const cases: { what: string; values: CellValue[]; direction: SortDirection; ids: number[] }[] = [
    // Korean order, as Intl.Collator('ko') gives it: Hangul before Latin letters.
    { what: 'text in Korean order', values: ['박서연', null, '김민준', '', '이지은', 'Acme'], direction: 'asc', ids: [3, 1, 5, 6, 2, 4] },
    { what: 'text in reverse, empty still last', values: ['박서연', null, '김민준', '', '이지은', 'Acme'], direction: 'desc', ids: [6, 5, 1, 3, 2, 4] },
    { what: 'numbers as numbers', values: [10, null, 2, 0], direction: 'asc', ids: [4, 3, 1, 2] },
    { what: 'numbers in reverse, empty still last', values: [10, null, 2, 0], direction: 'desc', ids: [1, 3, 4, 2] },
    { what: 'a column whose first rows are empty', values: [null, undefined, '', '나', '가'], direction: 'asc', ids: [5, 4, 1, 2, 3] },
    { what: 'a column whose first rows are empty, in reverse', values: [null, undefined, '', '나', '가'], direction: 'desc', ids: [4, 5, 1, 2, 3] },
    { what: 'dates written as YYYY-MM-DD', values: ['2026-12-01', null, '2026-11-23'], direction: 'asc', ids: [3, 1, 2] },
    { what: 'numbers inside text in number order', values: ['10번', '2번'], direction: 'asc', ids: [2, 1] },
    { what: 'equal values in their own order', values: ['나', '가', '나'], direction: 'asc', ids: [2, 1, 3] },
    { what: 'equal values in their own order, in reverse', values: ['나', '가', '나'], direction: 'desc', ids: [1, 3, 2] },
    { what: 'letters that differ only in case as equal', values: ['b', 'A', 'a', 'B'], direction: 'desc', ids: [1, 4, 2, 3] },
  ]

  it.each(cases)('sorts $what ($direction)', ({ values, direction, ids }) => {
    renderWithApp(<ItemTable items={itemsOf(values)} />, { path: `/items?sort=value&dir=${direction}` })
    expect(shownIds()).toEqual(ids)
  })

  it('sorts numbers smallest first on the first click, then only reverses', async () => {
    const { user, router } = renderWithApp(<ItemTable items={itemsOf([2, 3, 1])} />, { path: '/items' })
    const heading = screen.getByRole('columnheader', { name: /값/ })
    const click = () => user.click(within(heading).getByRole('button'))

    await click()
    expect(heading).toHaveAttribute('aria-sort', 'ascending')
    expect(shownIds()).toEqual([3, 1, 2])
    await click()
    expect(heading).toHaveAttribute('aria-sort', 'descending')
    expect(shownIds()).toEqual([2, 1, 3])
    await click()
    expect(heading).toHaveAttribute('aria-sort', 'ascending')
    expect(shownIds()).toEqual([3, 1, 2])
    expect(searchOf(router)).toEqual({ sort: 'value', dir: 'asc' })
  })

  it('sorts by one column when a heading is clicked with Shift', async () => {
    const { user, router } = renderWithApp(<ItemTable items={itemsOf([2, 1, 2])} />, { path: '/items?sort=value&dir=asc' })
    await user.keyboard('{Shift>}')
    await user.click(within(screen.getByRole('columnheader', { name: /번호/ })).getByRole('button'))
    await user.keyboard('{/Shift}')
    expect(searchOf(router)).toEqual({ sort: 'id', dir: 'asc' })
    expect(screen.getByRole('columnheader', { name: /값/ })).toHaveAttribute('aria-sort', 'none')
    expect(shownIds()).toEqual([1, 2, 3])
  })

  it.each(['nothing', 'plain'])('uses the default sort when the address asks for %s', (key) => {
    renderWithApp(<ItemTable items={itemsOf(['다', '나', '가'])} />, { path: `/items?sort=${key}&dir=desc` })
    expect(shownIds()).toEqual([1, 2, 3])
    const plain = screen.getByRole('columnheader', { name: '고정' })
    expect(plain).not.toHaveAttribute('aria-sort')
    expect(within(plain).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('DataTable searching (TBL-2)', () => {
  const items: Item[] = [
    { id: 1, value: null },
    { id: 2, value: '010-1234-5678' },
    { id: 3, value: '한빛 정밀' },
    { id: 4, value: 'Pacific Foods', note: '냉동 창고' },
    { id: 5, value: 42 },
  ]

  it.each([
    ['01012345678', [2]],
    ['한빛정밀', [3]],
    ['  pacific   F', [4]],
    ['냉동', [4]],
    ['42', [5]],
    ['   ', [1, 2, 3, 4, 5]],
  ])('finds %j', (query, ids) => {
    renderWithApp(<ItemTable items={items} />, { path: `/items?q=${encodeURIComponent(query)}` })
    expect(shownIds()).toEqual(ids)
  })

  it('looks only in the columns that are searched', () => {
    // 3 is a number in the first column, and in no value.
    renderWithApp(<ItemTable items={itemsOf(['가', '나', '다'])} />, { path: '/items?q=3' })
    expect(screen.getByText('‘3’과(와) 일치하는 결과가 없어요')).toBeInTheDocument()
  })

  it('sorts what it found', () => {
    renderWithApp(<ItemTable items={itemsOf(['나 공장', '본사', '가 공장'])} />, { path: '/items?q=%EA%B3%B5%EC%9E%A5&sort=value&dir=asc' })
    expect(shownIds()).toEqual([3, 1])
  })
})

describe('DataTable paging (TBL-1, TBL-6)', () => {
  const numbered = (total: number): Item[] => itemsOf(Array.from({ length: total }, (_, index) => `품목 ${index + 1}`))

  /** A table whose rows load again, as after a save or a delete. */
  function Reloading({ before, after }: { before: Item[]; after: Item[] }) {
    const [items, setItems] = useState(before)
    return (
      <>
        <button type="button" onClick={() => setItems(after)}>
          다시 읽기
        </button>
        <ItemTable items={items} />
      </>
    )
  }

  it('stays on its page when the rows load again', async () => {
    const after = numbered(120).map((item) => (item.id === 60 ? { ...item, value: '고친 품목' } : item))
    const { user, router } = renderWithApp(<Reloading before={numbered(120)} after={after} />, { path: '/items?page=2' })
    await user.click(screen.getByRole('button', { name: '다시 읽기' }))
    expect(screen.getByText('고친 품목')).toBeInTheDocument()
    expect(shownIds()[0]).toBe(51)
    expect(searchOf(router)).toEqual({ page: '2' })
  })

  it('shows the last page when the one it was on is gone', async () => {
    const { user } = renderWithApp(<Reloading before={numbered(101)} after={numbered(100)} />, { path: '/items?page=3' })
    expect(shownIds()).toEqual([101])
    await user.click(screen.getByRole('button', { name: '다시 읽기' }))
    expect(shownIds()).toHaveLength(50)
    expect(shownIds()[49]).toBe(100)
    expect(screen.getByText('2 / 2쪽')).toBeInTheDocument()
  })

  it('shows the last page for an address past the end, and goes back from there', async () => {
    const { user, router } = renderWithApp(<ItemTable items={numbered(120)} />, { path: '/items?page=9' })
    expect(shownIds()[0]).toBe(101)
    expect(screen.getByText('101–120 / 120')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /다음/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /이전/ }))
    expect(shownIds()[0]).toBe(51)
    expect(searchOf(router)).toEqual({ page: '2' })
  })

  it.each(['0', '-3', 'abc', ''])('shows the first page for page=%j', (page) => {
    renderWithApp(<ItemTable items={numbered(120)} />, { path: `/items?page=${page}` })
    expect(shownIds()[0]).toBe(1)
    expect(screen.getByText('1 / 3쪽')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /이전/ })).toBeDisabled()
  })

  it('goes to the page in the address after a search narrowed it to one', async () => {
    const { router } = renderWithApp(<ItemTable items={numbered(120)} />, { path: '/items?q=119' })
    expect(shownIds()).toEqual([119])
    await act(() => router.navigate('/items?page=2'))
    expect(shownIds()[0]).toBe(51)
    expect(screen.getByText('2 / 3쪽')).toBeInTheDocument()
  })

  it('shows every row once over its pages', async () => {
    const { user } = renderWithApp(<ItemTable items={numbered(120)} />, { path: '/items?sort=id&dir=desc' })
    const seen = shownIds()
    await user.click(screen.getByRole('button', { name: /다음/ }))
    seen.push(...shownIds())
    await user.click(screen.getByRole('button', { name: /다음/ }))
    seen.push(...shownIds())
    expect(seen).toEqual(Array.from({ length: 120 }, (_, index) => 120 - index))
  })
})
