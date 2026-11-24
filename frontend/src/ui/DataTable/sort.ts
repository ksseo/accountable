// What sorting table rows needs beside TanStack Table (TBL-3).

export type CellValue = string | number | null | undefined
export type SortDirection = 'asc' | 'desc'

// Korean order. numeric puts "2번" before "10번".
const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })

export function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

/** An empty value as undefined, the only one TanStack Table keeps last in both
 * directions. */
export function emptyAsUndefined(value: CellValue): string | number | undefined {
  return value === null || value === '' ? undefined : value
}
