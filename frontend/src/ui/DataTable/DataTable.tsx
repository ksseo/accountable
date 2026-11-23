import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useMemo, type MouseEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { quoted, withParticle } from '../../lib/korean'
import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import { RowMenu } from '../RowMenu'
import { SearchBox } from '../SearchBox'
import { SkeletonRows } from '../Skeleton'
import styles from './DataTable.module.css'
import { matches } from './search'
import { sortRows, type SortDirection, type SortValue } from './sort'

export const PAGE_SIZE = 50

export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Columns with a sort value can be sorted by clicking their heading. */
  sortValue?: (row: T) => SortValue
  align?: 'end'
  /** Keeps the column from wrapping, for dates and amounts. */
  nowrap?: boolean
}

type Props<T> = {
  /** Read out as the table's name. */
  caption: string
  /** The rows after the page's own filters; undefined while loading. */
  rows: T[] | undefined
  /** How many rows there are before the page's own filters, to tell "none yet" from "none match". */
  totalCount: number
  columns: Column<T>[]
  rowKey: (row: T) => number
  rowHref: (row: T) => string
  rowName: (row: T) => string
  searchFields: (row: T) => readonly (string | null | undefined)[]
  searchLabel: string
  searchPlaceholder: string
  defaultSort: { key: string; direction: SortDirection }
  /** Filters shown beside the search field. */
  toolbar?: ReactNode
  onEdit: (row: T) => void
  onDelete: (row: T) => void
  /** What an empty table says, and its next step (UI-6). */
  empty: { message: string; action?: ReactNode }
  /** What it says when the page's filters leave nothing and there's no search. */
  noMatchMessage?: string
}

/** A table that searches, sorts and pages its rows in the browser, 50 to a
 * page, and keeps all three in the page address (TBL-1 to TBL-4, TBL-6). */
export function DataTable<T>({
  caption,
  rows,
  totalCount,
  columns,
  rowKey,
  rowHref,
  rowName,
  searchFields,
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
  const requestedKey = params.get('sort')
  const sortColumn =
    columns.find((column) => column.key === requestedKey && column.sortValue) ??
    columns.find((column) => column.key === defaultSort.key)
  const direction: SortDirection =
    requestedKey && sortColumn?.key === requestedKey
      ? params.get('dir') === 'desc'
        ? 'desc'
        : 'asc'
      : defaultSort.direction

  const shown = useMemo(() => {
    if (!rows) return []
    const found = query ? rows.filter((row) => matches(searchFields(row), query)) : rows
    return sortColumn?.sortValue ? sortRows(found, sortColumn.sortValue, direction) : found
  }, [rows, query, searchFields, sortColumn, direction])

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(params.get('page')) || 1), pageCount)
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // The router applies address changes in a transition. Clicks (sort, page) flush
  // at once, so a quick second click reads the new state rather than the old.
  function update(changes: Record<string, string | null>, { replace = false, flush = false } = {}) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value === null || value === '') next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace, flushSync: flush },
    )
  }

  function sortBy(key: string) {
    const next: SortDirection = sortColumn?.key === key && direction === 'asc' ? 'desc' : 'asc'
    update({ sort: key, dir: next, page: null }, { flush: true })
  }

  function openRow(event: MouseEvent<HTMLTableRowElement>, row: T) {
    // Links, buttons and menus in the row do their own thing.
    if ((event.target as HTMLElement).closest('a, button, [role="menu"], [role="menuitem"]')) return
    navigate(rowHref(row))
  }

  const firstShown = shown.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastShown = Math.min(page * PAGE_SIZE, shown.length)

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

      {rows === undefined ? (
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
                    const sorted = sortColumn?.key === column.key
                    const align = column.align === 'end' ? styles.end : ''
                    if (!column.sortValue) {
                      return (
                        <th key={column.key} scope="col" className={align}>
                          {column.header}
                        </th>
                      )
                    }
                    const Icon = sorted ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        className={align}
                        aria-sort={sorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          className={sorted ? `${styles.sort} ${styles.sorted}` : styles.sort}
                          onClick={() => sortBy(column.key)}
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
                {pageRows.map((row) => (
                  <tr key={rowKey(row)} className={styles.row} onClick={(event) => openRow(event, row)}>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={[column.align === 'end' ? styles.end : '', column.nowrap ? styles.nowrap : '']
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
                          { key: 'delete', label: '삭제', icon: <Trash2 size={16} aria-hidden="true" />, danger: true },
                        ]}
                        onAction={(key) => (key === 'edit' ? onEdit(row) : onDelete(row))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {shown.length === 0 ? (
            <EmptyState message={query ? `${quoted(query.trim(), withParticle)} 일치하는 결과가 없어요` : noMatchMessage} />
          ) : (
            <nav className={styles.pager} aria-label="페이지">
              <span className={styles.range}>
                {firstShown}–{lastShown} / {shown.length.toLocaleString('ko-KR')}
              </span>
              <Button
                variant="page"
                size="sm"
                isDisabled={page <= 1}
                onPress={() => update({ page: page - 1 > 1 ? String(page - 1) : null }, { flush: true })}
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
                isDisabled={page >= pageCount}
                onPress={() => update({ page: String(page + 1) }, { flush: true })}
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
