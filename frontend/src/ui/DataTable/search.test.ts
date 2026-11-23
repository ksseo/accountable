import { describe, expect, it } from 'vitest'
import { matches, normalize } from './search'

describe('search', () => {
  it('ignores upper and lower case', () => {
    expect(matches(['Pacific Foods'], 'pacific')).toBe(true)
    expect(matches(['pacific foods'], 'PACIFIC F')).toBe(true)
  })

  it('ignores extra spaces', () => {
    expect(normalize('  한빛   정밀  ')).toBe('한빛 정밀')
    expect(matches(['한빛 정밀'], '  한빛    정밀 ')).toBe(true)
    expect(matches(['한빛정밀'], '한빛 정밀')).toBe(true)
  })

  it('matches any part of any field', () => {
    expect(matches(['김민준', 'minjun@hanbit.example'], '민준')).toBe(true)
    expect(matches(['김민준', 'minjun@hanbit.example'], 'hanbit')).toBe(true)
    expect(matches(['김민준', null, undefined], '박서연')).toBe(false)
  })

  it('matches phone numbers by their digits', () => {
    expect(matches(['010-1234-5678'], '01012345678')).toBe(true)
    expect(matches(['010-1234-5678'], '1234 5678')).toBe(true)
    expect(matches(['+82 10 1234 5678'], '1012345678')).toBe(true)
    expect(matches(['010-1234-5678'], '9999')).toBe(false)
  })

  it('does not match letters by digits', () => {
    expect(matches(['2027 포장재 공급'], '2027')).toBe(true)
    expect(matches(['A1-B2'], '12')).toBe(false)
  })

  it('treats an empty search as matching everything', () => {
    expect(matches([null], '   ')).toBe(true)
  })

  it('matches Korean typed in decomposed form', () => {
    expect(matches(['한빛'], '한빛'.normalize('NFD'))).toBe(true)
  })
})
