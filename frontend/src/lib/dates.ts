// Dates in Korean formats (KO-2, KO-3).
//
// A close date or follow-up date is a day with no time, sent as YYYY-MM-DD.
// `new Date('2026-11-23')` reads that as midnight UTC, which is the 22nd west
// of Greenwich, so these helpers read it as a local date instead.
// Today comes from /api/meta, never from the computer's clock.

const DATE = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })
const DATE_WEEKDAY = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
})
const DATE_TIME = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const MONTH_DAY = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric' })
const TIME = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' })

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** A YYYY-MM-DD date as local midnight on that day. */
export function parseLocalDate(value: string): Date {
  const match = ISO_DATE.exec(value)
  if (!match) throw new Error(`Not a YYYY-MM-DD date: ${value}`)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** A local date as YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** "2026. 11. 23." */
export function formatDate(value: string): string {
  return DATE.format(parseLocalDate(value))
}

/** "2026. 11. 23. (월)" */
export function formatDateWithWeekday(value: string): string {
  return DATE_WEEKDAY.format(parseLocalDate(value))
}

/** A timestamp from the API, in local time: "2026. 11. 23. 오후 3:20". */
export function formatDateTime(value: string | Date): string {
  return DATE_TIME.format(typeof value === 'string' ? new Date(value) : value)
}

/** A date this year, short: "11. 25." */
export function formatMonthDay(value: string): string {
  return MONTH_DAY.format(parseLocalDate(value))
}

/** When something happened, as short as it can be against today (YYYY-MM-DD):
 * "오늘 오전 10:42", "11. 20. 오후 4:30" this year, or the full date and time. */
export function formatRecent(value: string | Date, today: string): string {
  const moment = typeof value === 'string' ? new Date(value) : value
  const day = toIsoDate(moment)
  if (day === today) return `오늘 ${TIME.format(moment)}`
  if (day.slice(0, 4) === today.slice(0, 4)) return `${MONTH_DAY.format(moment)} ${TIME.format(moment)}`
  return formatDateTime(moment)
}

/** A chart's month label for "YYYY-MM": "12월", or "2026년 1월" for January
 * and for the first month on an axis. */
export function formatChartMonth(month: string, first = false): string {
  const [year, number] = month.split('-').map(Number)
  return number === 1 || first ? `${year}년 ${number}월` : `${number}월`
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. */
export function daysBetween(from: string, to: string): number {
  const ms = parseLocalDate(to).getTime() - parseLocalDate(from).getTime()
  return Math.round(ms / 86_400_000)
}

/** YYYY-MM-DD plus some days. */
export function addDays(value: string, days: number): string {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}
