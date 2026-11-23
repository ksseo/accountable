import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatChartMonth,
  formatDate,
  formatDateTime,
  formatDateWithWeekday,
  formatMonthDay,
  formatRecent,
  parseLocalDate,
} from './dates'

const startZone = process.env.TZ

afterEach(() => {
  // Assigning undefined would set the text "undefined", which Node reads as UTC.
  if (startZone === undefined) delete process.env.TZ
  else process.env.TZ = startZone
})

describe('Korean date formats', () => {
  it('writes dates the ko-KR way', () => {
    expect(formatDate('2026-11-23')).toBe('2026. 11. 23.')
    expect(formatDate('2026-01-05')).toBe('2026. 1. 5.')
  })

  it('adds the weekday', () => {
    expect(formatDateWithWeekday('2026-11-23')).toBe('2026. 11. 23. (월)')
  })

  it('adds the time with 오전 or 오후', () => {
    expect(formatDateTime(new Date(2026, 10, 23, 15, 20))).toBe('2026. 11. 23. 오후 3:20')
    expect(formatDateTime(new Date(2026, 10, 23, 9, 5))).toBe('2026. 11. 23. 오전 9:05')
  })

  it('writes a short date and how recent something was', () => {
    expect(formatMonthDay('2026-11-25')).toBe('11. 25.')
    expect(formatRecent(new Date(2026, 10, 23, 10, 42), '2026-11-23')).toBe('오늘 오전 10:42')
    expect(formatRecent(new Date(2026, 10, 20, 16, 30), '2026-11-23')).toBe('11. 20. 오후 4:30')
    expect(formatRecent(new Date(2025, 11, 30, 9, 5), '2026-01-02')).toBe('2025. 12. 30. 오전 9:05')
  })

  it('writes chart months', () => {
    expect(formatChartMonth('2026-12')).toBe('12월')
    expect(formatChartMonth('2026-01')).toBe('2026년 1월')
    expect(formatChartMonth('2025-12', true)).toBe('2025년 12월')
  })

  it('refuses other text', () => {
    expect(() => parseLocalDate('2026-11-23T00:00:00Z')).toThrow()
  })
})

describe('YYYY-MM-DD dates are local dates', () => {
  // A browser's time zone is set before the page loads, so the module is loaded
  // again after each zone is set.
  for (const zone of ['America/Los_Angeles', 'Asia/Seoul', 'UTC']) {
    it(`stays the same day in ${zone}`, async () => {
      process.env.TZ = zone
      vi.resetModules()
      const dates = await import('./dates')
      expect(new Date('2026-11-23').getTimezoneOffset()).toBe(
        { 'America/Los_Angeles': 480, 'Asia/Seoul': -540, UTC: 0 }[zone],
      )
      expect(dates.parseLocalDate('2026-11-23').getDate()).toBe(23)
      expect(dates.formatDate('2026-11-23')).toBe('2026. 11. 23.')
      expect(dates.formatDateWithWeekday('2026-11-23')).toBe('2026. 11. 23. (월)')
      expect(dates.toIsoDate(dates.parseLocalDate('2026-11-23'))).toBe('2026-11-23')
      expect(dates.addDays('2026-11-23', 14)).toBe('2026-12-07')
      expect(dates.daysBetween('2026-11-14', '2026-11-23')).toBe(9)
    })
  }
})
