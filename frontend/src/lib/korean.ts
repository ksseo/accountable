// Counter words and particles (KO-5, KO-6).

const COUNTERS = {
  deal: '건',
  activity: '건',
  followUp: '건',
  contact: '명',
  organization: '곳',
} as const

export type Counted = keyof typeof COUNTERS

const NUMBER = new Intl.NumberFormat('ko-KR')

/** "3건", "5명", "4곳", "1,000건" */
export function count(value: number, what: Counted): string {
  return `${NUMBER.format(value)}${COUNTERS[what]}`
}

const HANGUL_FIRST = 0xac00
const HANGUL_LAST = 0xd7a3

/** Whether a word's last letter has a final consonant (받침): true or false for
 * a Hangul syllable, null when the word doesn't end in one. */
export function hasFinalConsonant(word: string): boolean | null {
  const last = word.trim().at(-1)
  if (!last) return null
  const code = last.charCodeAt(0)
  if (code < HANGUL_FIRST || code > HANGUL_LAST) return null
  return (code - HANGUL_FIRST) % 28 !== 0
}

function pick(word: string, withFinal: string, withoutFinal: string): string {
  const final = hasFinalConsonant(word)
  if (final === null) return `${withFinal}(${withoutFinal})`
  return final ? withFinal : withoutFinal
}

/** 을/를, both written when the code can't tell: "을(를)". */
export const objectParticle = (word: string) => pick(word, '을', '를')

/** 과/와, both written when the code can't tell: "과(와)". */
export const withParticle = (word: string) => pick(word, '과', '와')

/** 은/는 */
export const topicParticle = (word: string) => pick(word, '은', '는')

/** 이/가 */
export const subjectParticle = (word: string) => pick(word, '이', '가')

/** A name in quotes with its particle: "‘한빛정밀’을". */
export function quoted(word: string, particle: (word: string) => string): string {
  return `‘${word}’${particle(word)}`
}
