import { describe, expect, it } from 'vitest'
import { count, hasFinalConsonant, objectParticle, quoted, withParticle } from './korean'

describe('counter words', () => {
  it('counts deals, activities and follow-ups in 건, contacts in 명, organizations in 곳', () => {
    expect(count(3, 'deal')).toBe('3건')
    expect(count(7, 'activity')).toBe('7건')
    expect(count(2, 'followUp')).toBe('2건')
    expect(count(5, 'contact')).toBe('5명')
    expect(count(4, 'organization')).toBe('4곳')
    expect(count(1000, 'deal')).toBe('1,000건')
  })
})

describe('particles', () => {
  it('tells a final consonant', () => {
    expect(hasFinalConsonant('한빛정밀')).toBe(true)
    expect(hasFinalConsonant('김민준')).toBe(true)
    expect(hasFinalConsonant('대성기계')).toBe(false)
    expect(hasFinalConsonant('Packaging')).toBeNull()
    expect(hasFinalConsonant('2027')).toBeNull()
    expect(hasFinalConsonant('')).toBeNull()
  })

  it('picks 을/를 and 과/와 for Korean names', () => {
    expect(objectParticle('한빛정밀')).toBe('을')
    expect(objectParticle('대성기계')).toBe('를')
    expect(withParticle('한빛')).toBe('과')
    expect(withParticle('코리아')).toBe('와')
    expect(quoted('2027 포장재 공급', objectParticle)).toBe('‘2027 포장재 공급’을')
  })

  it('writes both for other names', () => {
    expect(objectParticle('Pacific Foods')).toBe('을(를)')
    expect(withParticle('Acme')).toBe('과(와)')
    expect(quoted('010', withParticle)).toBe('‘010’과(와)')
  })
})
