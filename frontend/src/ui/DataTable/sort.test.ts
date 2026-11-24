import { describe, expect, it } from 'vitest'
import { compareValues, emptyAsUndefined } from './sort'

const sorted = (values: (string | number)[]) => [...values].sort(compareValues)

describe('compareValues', () => {
  // Korean order, as Intl.Collator('ko') gives it: Hangul before Latin letters.
  it('compares text in Korean order', () => {
    expect(sorted(['박서연', '김민준', '이지은', 'Acme'])).toEqual(['김민준', '박서연', '이지은', 'Acme'])
  })

  it('compares numbers as numbers', () => {
    expect(sorted([10, 2, 0])).toEqual([0, 2, 10])
  })

  it('compares dates written as YYYY-MM-DD', () => {
    expect(sorted(['2026-12-01', '2026-11-23'])).toEqual(['2026-11-23', '2026-12-01'])
  })

  it('compares numbers inside text in number order', () => {
    expect(sorted(['10번', '2번'])).toEqual(['2번', '10번'])
  })

  it('takes letters that differ only in case as equal', () => {
    expect(compareValues('acme', 'ACME')).toBe(0)
  })
})

describe('emptyAsUndefined', () => {
  it.each([[null], [undefined], ['']])('takes %j as empty', (value) => {
    expect(emptyAsUndefined(value)).toBeUndefined()
  })

  it.each([[0], ['0'], ['한빛정밀']])('keeps %j', (value) => {
    expect(emptyAsUndefined(value)).toBe(value)
  })
})
