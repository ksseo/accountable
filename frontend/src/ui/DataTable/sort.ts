// Sorting table rows in the browser (TBL-3).

export type SortValue = string | number | null | undefined
export type SortDirection = 'asc' | 'desc'

// Korean order. numeric puts "2번" before "10번".
const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })

const isEmpty = (value: SortValue) => value === null || value === undefined || value === ''

export function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

/** Rows sorted by one value. Empty values always go last, in both directions;
 * rows with equal values keep their order. */
export function sortRows<T>(rows: readonly T[], value: (row: T) => SortValue, direction: SortDirection): T[] {
  const sign = direction === 'asc' ? 1 : -1
  return rows
    .map((row, index) => ({ row, index, value: value(row) }))
    .sort((a, b) => {
      const aEmpty = isEmpty(a.value)
      const bEmpty = isEmpty(b.value)
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1
      return sign * compareValues(a.value as string | number, b.value as string | number) || a.index - b.index
    })
    .map((item) => item.row)
}
