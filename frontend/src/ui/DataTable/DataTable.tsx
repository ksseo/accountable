import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  functionalUpdate,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { quoted, withParticle } from '../../lib/korean'
import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { LoadError } from '../LoadError'
import { RowMenu } from '../RowMenu'
import { SearchBox } from '../SearchBox'
import { SkeletonRows } from '../Skeleton'
import styles from './DataTable.module.css'
import { matches } from './search'
import { compareValues, emptyAsUndefined, type CellValue, type SortDirection } from './sort'

export const PAGE_SIZE = 50

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

const NO_ROWS: never[] = []

export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** What it's sorted by. A column with a value can be sorted by clicking its heading. */
  value?: (row: T) => CellValue
  /** Whether search looks in its value. */
  searchable?: boolean
  align?: 'end'
  /** Keeps the column from wrapping, for dates and amounts. */
  nowrap?: boolean
}

type Sort = { key: string; direction: SortDirection }

type Props<T extends RowData> = {
  /** Read out as the table's name. */
  caption: string
  /** The rows after the page's own filters; undefined while loading. */
  rows: T[] | undefined
  /** Loads the rows again, given when they couldn't be loaded. */
  onRetry?: () => void
  /** How many rows there are before the page's own filters, to tell "none yet" from "none match". */
  totalCount: number
  columns: Column<T>[]
  rowKey: (row: T) => number
  rowHref: (row: T) => string
  rowName: (row: T) => string
  searchLabel: string
  searchPlaceholder: string
  defaultSort: Sort
  /** Filters shown beside the search field. */
  toolbar?: ReactNode
  onEdit: (row: T) => void
  onDelete: (row: T) => void
  /** What an empty table says, and its next step (UI-6). */
  empty: { message: string; action?: ReactNode }
  /** What it says when the page's filters leave nothing and there's no search. */
  noMatchMessage?: string
}

/** The sort the address asks for, or the table's own if it asks for none it can do. */
function sortFrom<T>(params: URLSearchParams, columns: Column<T>[], defaultSort: Sort): Sort {
  const requested = columns.find((column) => column.key === params.get('sort') && column.value)
  if (!requested) return defaultSort
  return { key: requested.key, direction: params.get('dir') === 'desc' ? 'desc' : 'asc' }
}

/** A table that searches, sorts and pages its rows in the browser, 50 to a
 * page, and keeps all three in the page address (TBL-1 to TBL-4, TBL-6).
 * TanStack Table does the three; the address holds what it's asked for. */
export function DataTable<T extends RowData>({
  caption,
  rows,
  onRetry,
  totalCount,
  columns,
  rowKey,
  rowHref,
  rowName,
  searchLabel,
  searchPlaceholder,
  defaultSort,
  toolbar,
  onEdit,
  onDelete,
  empty,
  noMatchMessage = '조건에 맞는 결과가 없어요',
}: Props<T>) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const query = params.get('q') ?? ''
  const { key: sortKey, direction } = sortFrom(params, columns, defaultSort)

  // The address can ask for a page that isn't there, such as after a delete.
  const [lastPage, setLastPage] = useState(Infinity)
  const page = Math.min(Math.max(1, Math.trunc(Number(params.get('page'))) || 1), lastPage)

  // The router applies address changes in a transition, which can finish after
  // the next click or letter. Flushed, they're in place before it: a second click
  // reads the new state, and an older search doesn't overwrite newer typing.
  function update(changes: Record<string, string | null>, { replace = false } = {}) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === '') next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace, flushSync: true },
    )
  }

  const definitions = useMemo(
    () =>
      columns.map(({ key, value, searchable = false }): ColumnDef<typeof features, T> =>
        value
          ? {
              id: key,
              accessorFn: (row) => emptyAsUndefined(value(row)),
              enableGlobalFilter: searchable,
              sortFn: (a, b, id) =>
                compareValues(a.getValue<string | number>(id), b.getValue<string | number>(id)),
              sortUndefined: 'last',
            }
          : { id: key },
      ),
    [columns],
  )
  const sorting = useMemo(() => [{ id: sortKey, desc: direction === 'desc' }], [sortKey, direction])
  const pagination = useMemo(() => ({ pageIndex: page - 1, pageSize: PAGE_SIZE }), [page])

  const table = useTable({
    features,
    columns: definitions,
    data: rows ?? NO_ROWS,
    getRowId: (row) => String(rowKey(row)),
    state: { globalFilter: query, sorting, pagination },
    globalFilterFn: (row, id, wanted: string) => matches([String(row.getValue<CellValue>(id) ?? '')], wanted),
    // A heading sorts upward first, then only reverses, by one column at a time.
    sortDescFirst: false,
    enableSortingRemoval: false,
    enableMultiSort: false,
    onSortingChange: (updater) => {
      const [next] = functionalUpdate(updater, sorting)
      update({ sort: next.id, dir: next.desc ? 'desc' : 'asc', page: null })
    },
    // A save on page 2 stays on page 2.
    autoResetPageIndex: false,
    onPaginationChange: (updater) => {
      const { pageIndex } = functionalUpdate(updater, pagination)
      update({ page: pageIndex > 0 ? String(pageIndex + 1) : null })
    },
  })

  const shownCount = table.getFilteredRowModel().rows.length
  const pageCount = Math.max(1, table.getPageCount())
  if (pageCount !== lastPage) setLastPage(pageCount)

  function openRow(event: MouseEvent<HTMLTableRowElement>, row: T) {
    // Links, buttons and menus in the row do their own thing.
    if ((event.target as HTMLElement).closest('a, button, [role="menu"], [role="menuitem"]')) return
    navigate(rowHref(row))
  }

  const firstShown = shownCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastShown = Math.min(page * PAGE_SIZE, shownCount)

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <SearchBox
          label={searchLabel}
          placeholder={searchPlaceholder}
          value={query}
          onSearch={(value) => update({ q: value.trim() ? value : null, page: null }, { replace: true })}
        />
        {toolbar}
      </div>

      {onRetry ? (
        <LoadError onRetry={onRetry} />
      ) : rows === undefined ? (
        <SkeletonRows />
      ) : totalCount === 0 ? (
        <EmptyState message={empty.message} action={empty.action} />
      ) : (
        <>
          <div className={styles.scroller}>
            <table className={styles.table}>
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map((column) => {
                    const tableColumn = table.getColumn(column.key)
                    const align = column.align === 'end' ? styles.end : ''
                    if (!tableColumn?.getCanSort()) {
                      return (
                        <th key={column.key} scope="col" className={align}>
                          {column.header}
                        </th>
                      )
                    }
                    const sorted = tableColumn.getIsSorted()
                    const Icon = sorted ? (sorted === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        className={align}
                        aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          className={sorted ? `${styles.sort} ${styles.sorted}` : styles.sort}
                          onClick={tableColumn.getToggleSortingHandler()}
                        >
                          {column.header}
                          <Icon size={14} aria-hidden="true" />
                        </button>
                      </th>
                    )
                  })}
                  <th scope="col" className={styles.menuCell}>
                    <span className="sr-only">메뉴</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.getRowModel().rows.map(({ id, original: row }) => (
                  <tr key={id} className={styles.row} onClick={(event) => openRow(event, row)}>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={[
                          column.align === 'end' ? styles.end : '',
                          column.nowrap ? styles.nowrap : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                    <td className={styles.menuCell}>
                      <RowMenu
                        label={`${rowName(row)} 메뉴`}
                        items={[
                          { key: 'edit', label: '수정', icon: <Pencil size={16} aria-hidden="true" /> },
                          {
                            key: 'delete',
                            label: '삭제',
                            icon: <Trash2 size={16} aria-hidden="true" />,
                            danger: true,
                          },
                        ]}
                        onAction={(key) => (key === 'edit' ? onEdit(row) : onDelete(row))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {shownCount === 0 ? (
            <EmptyState
              message={
                query ? `${quoted(query.trim(), withParticle)} 일치하는 결과가 없어요` : noMatchMessage
              }
            />
          ) : (
            <nav className={styles.pager} aria-label="페이지">
              <span className={styles.range}>
                {firstShown}–{lastShown} / {shownCount.toLocaleString('ko-KR')}
              </span>
              <Button
                variant="page"
                size="sm"
                isDisabled={!table.getCanPreviousPage()}
                onPress={() => table.previousPage()}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                이전
              </Button>
              <span className={styles.pageNumber} aria-live="polite">
                {page} / {pageCount}쪽
              </span>
              <Button
                variant="page"
                size="sm"
                isDisabled={!table.getCanNextPage()}
                onPress={() => table.nextPage()}
              >
                다음
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
