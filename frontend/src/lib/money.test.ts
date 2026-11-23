import { describe, expect, it } from 'vitest'
import { formatAxisMoney, formatMoney, parseMoney } from './money'

describe('formatMoney', () => {
  it('writes whole dollars with commas and the narrow sign', () => {
    expect(formatMoney(12_500)).toBe('$12,500')
    expect(formatMoney(0)).toBe('$0')
    expect(formatMoney(1_000_000_000)).toBe('$1,000,000,000')
  })

  it('never writes US$', () => {
    expect(formatMoney(12_500)).not.toContain('US')
  })
})

describe('parseMoney', () => {
  it('reads the three ways of typing an amount', () => {
    expect(parseMoney('12500')).toBe(12_500)
    expect(parseMoney('12,500')).toBe(12_500)
    expect(parseMoney('$12,500')).toBe(12_500)
    expect(parseMoney(' $ 1,000,000 ')).toBe(1_000_000)
    expect(parseMoney('0')).toBe(0)
  })

  it('refuses other text', () => {
    for (const text of ['', '12.5', '-100', '12,50', '1,2345', 'US$100', '만원', '$', '12 500', '1e5']) {
      expect(parseMoney(text), text).toBeNull()
    }
  })
})

describe('formatAxisMoney', () => {
  it('shortens amounts on chart axes', () => {
    expect(formatAxisMoney(120_000)).toBe('$120K')
    expect(formatAxisMoney(1_200_000)).toBe('$1.2M')
    expect(formatAxisMoney(0)).toBe('$0')
    expect(formatAxisMoney(2_000_000)).toBe('$2M')
    expect(formatAxisMoney(1_500)).toBe('$1.5K')
  })
})
