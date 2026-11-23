// Amounts in whole US dollars (KO-4, FORM-5).
//
// ko-KR currency formatting writes "US$12,500", so the narrow symbol is asked for.

const MONEY = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})

export const MAX_VALUE = 1_000_000_000

/** "$12,500" */
export function formatMoney(value: number): string {
  return MONEY.format(value)
}

const TYPED_AMOUNT = /^\$?\s*(\d{1,3}(,\d{3})+|\d+)$/

/** A typed amount, "12500", "12,500" or "$12,500", as a number; null for anything else. */
export function parseMoney(text: string): number | null {
  const match = TYPED_AMOUNT.exec(text.trim())
  if (!match) return null
  return Number(match[1].replaceAll(',', ''))
}

/** A chart axis label: "$120K", "$1.2M". Everywhere else amounts are written in full. */
export function formatAxisMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${trim(value / 1_000_000)}M`
  if (Math.abs(value) >= 1_000) return `$${trim(value / 1_000)}K`
  return `$${value}`
}

function trim(value: number): string {
  return String(Math.round(value * 10) / 10)
}

/** "75%" */
export function formatPercent(value: number): string {
  return `${value}%`
}
