// Searching table rows in the browser (TBL-2).

/** Lower case, one space between words, Korean letters in their composed form. */
export function normalize(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
}

const digitsOf = (text: string) => text.replace(/\D/g, '')

// A query that looks like a phone number: digits with dashes, spaces, dots,
// brackets or a leading +.
const PHONE_LIKE = /^[\d\s\-.()+]+$/

/** Whether any field holds the query: any part of it, ignoring case and extra
 * spaces. Phone numbers also match by their digits alone, so "01012345678"
 * finds "010-1234-5678". */
export function matches(fields: readonly (string | null | undefined)[], query: string): boolean {
  const wanted = normalize(query)
  if (!wanted) return true
  const wantedTight = wanted.replaceAll(' ', '')
  const wantedDigits = PHONE_LIKE.test(wanted) ? digitsOf(wanted) : ''
  return fields.some((field) => {
    if (!field) return false
    const text = normalize(field)
    if (text.includes(wanted) || text.replaceAll(' ', '').includes(wantedTight)) return true
    return wantedDigits.length >= 3 && digitsOf(text).includes(wantedDigits)
  })
}
