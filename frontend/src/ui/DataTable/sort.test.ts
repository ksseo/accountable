import { describe, expect, it } from 'vitest'
import { sortRows } from './sort'

const names = (rows: { name: string | null }[]) => rows.map((row) => row.name)

describe('sortRows', () => {
  const rows = [{ name: '박서연' }, { name: null }, { name: '김민준' }, { name: '' }, { name: '이지은' }, { name: 'Acme' }]

  // Korean order, as Intl.Collator('ko') gives it: Hangul before Latin letters.
  it('sorts text in Korean order', () => {
    expect(names(sortRows(rows, (row) => row.name, 'asc'))).toEqual(['김민준', '박서연', '이지은', 'Acme', null, ''])
  })

  it('keeps empty values last when reversed', () => {
    expect(names(sortRows(rows, (row) => row.name, 'desc'))).toEqual(['Acme', '이지은', '박서연', '김민준', null, ''])
  })

  it('sorts numbers as numbers, with empty last both ways', () => {
    const values = [{ v: 10 }, { v: null }, { v: 2 }, { v: 0 }]
    expect(sortRows(values, (row) => row.v, 'asc').map((row) => row.v)).toEqual([0, 2, 10, null])
    expect(sortRows(values, (row) => row.v, 'desc').map((row) => row.v)).toEqual([10, 2, 0, null])
  })

  it('sorts dates written as YYYY-MM-DD', () => {
    const dates = [{ d: '2026-12-01' }, { d: null }, { d: '2026-11-23' }]
    expect(sortRows(dates, (row) => row.d, 'asc').map((row) => row.d)).toEqual(['2026-11-23', '2026-12-01', null])
  })

  it('puts numbers inside text in number order', () => {
    const items = [{ name: '10번' }, { name: '2번' }]
    expect(names(sortRows(items, (row) => row.name, 'asc'))).toEqual(['2번', '10번'])
  })

  it('keeps the order of equal values', () => {
    const items = [{ name: 'b', id: 1 }, { name: 'a', id: 2 }, { name: 'b', id: 3 }]
    expect(sortRows(items, (row) => row.name, 'desc').map((row) => row.id)).toEqual([1, 3, 2])
  })
})
