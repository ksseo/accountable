// Every color is in tokens.css, and nothing else asks which mode it is (LOOK-3).
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const FRONTEND = path.resolve(import.meta.dirname, '../..')
const TOKENS = 'src/styles/tokens.css'

const sources = [
  'index.html',
  ...readdirSync(path.join(FRONTEND, 'src'), { recursive: true, encoding: 'utf8' }).map((name) =>
    path.posix.join('src', name.replaceAll('\\', '/')),
  ),
]
  .filter((name) => /\.(css|tsx?|html)$/.test(name) && !/\.test\.tsx?$|\.d\.ts$/.test(name))
  .filter((name) => name !== TOKENS)
  .map((name) => ({ name, text: withoutComments(readFileSync(path.join(FRONTEND, name), 'utf8')) }))

const tokens = withoutComments(readFileSync(path.join(FRONTEND, TOKENS), 'utf8'))

/** The names one block of tokens.css gives a value to. */
function namesIn(selector: string): string[] {
  const start = tokens.indexOf(`${selector} {`)
  if (start < 0) return []
  const block = tokens.slice(start, tokens.indexOf('}', start))
  return [...block.matchAll(/(--[\w-]+):/g)].map(([, name]) => name)
}

/** The same text with its comments blanked out, so lines keep their numbers. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|(?<=^|\s)\/\/.*$/gm, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  )
}

// Not colors of their own: they take one from somewhere else, or draw nothing.
const BORROWED = new Set(['transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'revert'])
const CODED =
  /#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b|\b(?:rgb|hsl|hwb|(?:ok)?lab|(?:ok)?lch|color)a?(?:-mix)?\(/i
const COLORED = /\b(?:fill|stroke|color|background(?:Color)?|borderColor|ink)(?:=|:\s*)["'`{]+([\w-]+)["'`]/g
const DECLARED = /[\w-]+\s*:\s*([^;{}]+)(?=[;}])/g

/** Whether a word is the name of a color, as the browser's own list has it. */
function isColorName(word: string): boolean {
  const probe = document.createElement('i').style
  probe.color = word
  return probe.color !== '' && !BORROWED.has(word.toLowerCase())
}

/** The words in a line that could name a color: a style's values, or a color prop's text. */
function colorWords(line: string, isCss: boolean): string[] {
  const values = [...line.matchAll(isCss ? DECLARED : COLORED)].map(([, value]) => value)
  return values.flatMap((value) => value.replace(/var\([^)]*\)/g, ' ').split(/[\s,()/]+/))
}

/** The lines, as "file:line: text", that `found` picks. */
function linesWhere(found: (line: string, name: string) => boolean): string[] {
  return sources.flatMap(({ name, text }) =>
    text
      .split('\n')
      .flatMap((line, index) => (found(line, name) ? [`${name}:${index + 1}: ${line.trim()}`] : [])),
  )
}

describe('the color tokens', () => {
  it('are the only place with a color of its own', () => {
    expect(
      linesWhere(
        (line, name) => CODED.test(line) || colorWords(line, name.endsWith('.css')).some(isColorName),
      ),
    ).toEqual([])
  })

  it('are the only place that asks for the mode, apart from what sets it', () => {
    const asks = /data-mode|dataset\.mode|prefers-color-scheme|light-dark\(/
    const sets = ['index.html', 'src/app/mode.ts']
    expect(linesWhere((line, name) => !sets.includes(name) && asks.test(line))).toEqual([])
  })

  it('give dark mode values only for names light mode has, and only once', () => {
    const dark = namesIn(":root[data-mode='dark']")
    expect(dark.length).toBeGreaterThan(0)
    expect(dark.filter((name) => !namesIn(':root').includes(name))).toEqual([])
    expect(new Set(dark).size).toBe(dark.length)
  })

  it('keep the brand colors the same in both modes', () => {
    const brand = ['sea-green', 'marigold', 'coral', 'cerulean', 'raspberry', 'midnight', 'sea-mist']
    const names = brand.map((name) => `--${name}`)
    expect(namesIn(':root')).toEqual(expect.arrayContaining(names))
    expect(namesIn(":root[data-mode='dark']").filter((name) => names.includes(name))).toEqual([])
  })
})
