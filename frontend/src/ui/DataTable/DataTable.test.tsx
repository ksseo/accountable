import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithApp, searchOf } from '../../test/render'
import { DataTable, type Column } from './DataTable'

type Row = { id: number; name: string; phone: string | null }

// 120 rows: 품목 001 to 품목 120, every tenth without a phone number.
const ROWS: Row[] = Array.from({ length: 120 }, (_, index) => ({
  id: index + 1,
  name: `품목 ${String(index + 1).padStart(3, '0')}`,
  phone: index % 10 === 0 ? null : `010-0000-${String(index + 1).padStart(4, '0')}`,
}))

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: '이름', sortValue: (row) => row.name, cell: (row) => row.name },
  { key: 'phone', header: '전화번호', sortValue: (row) => row.phone, cell: (row) => row.phone },
]

function table(rows: Row[] | undefined, path = '/items') {
  return renderWithApp(
    <DataTable
      caption="품목 목록"
      rows={rows}
      totalCount={rows?.length ?? 0}
      columns={COLUMNS}
      rowKey={(row) => row.id}
      rowHref={(row) => `/items/${row.id}`}
      rowName={(row) => row.name}
      searchFields={(row) => [row.name, row.phone]}
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
})
