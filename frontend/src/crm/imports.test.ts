// Features import each other one way, so there are no cycles (docs/plan.md, "How
// the code is laid out"). The backend's test_imports.py checks its side.

import { describe, expect, it } from 'vitest'

const MAY_USE: Record<string, readonly string[]> = {
  activities: [],
  organizations: [],
  contacts: ['activities', 'organizations'],
  deals: ['activities', 'organizations', 'contacts'],
  pipeline: ['deals'],
  dashboard: ['activities', 'deals'],
}

const SOURCES = Object.entries(
  import.meta.glob<string>('./**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
).filter(([path]) => !path.includes('.test.'))

/** The feature a file is in, or null for one of the area's shared files. */
function featureOf(path: string): string | null {
  const parts = path.replace(/^\.\//, '').split('/')
  return parts.length > 1 ? parts[0] : null
}

/** "contacts/ContactPage.tsx uses deals", for each import that isn't allowed. */
function forbidden(): string[] {
  return SOURCES.flatMap(([path, source]) => {
    const feature = featureOf(path)
    const allowed = feature === null ? [] : [feature, ...MAY_USE[feature]]
    return [...source.matchAll(/from '(\.[^']+)'/g)].flatMap(([, target]) => {
      const { pathname } = new URL(target, `file:///crm/${path.slice(2)}`)
      if (!pathname.startsWith('/crm/')) return []
      const used = featureOf(pathname.slice('/crm/'.length))
      return used === null || allowed.includes(used) ? [] : [`${path.slice(2)} uses ${used}`]
    })
  })
}

describe('imports between features', () => {
  it('reads every feature', () => {
    const features = new Set(SOURCES.map(([path]) => featureOf(path)).filter((name) => name !== null))
    expect([...features].sort()).toEqual(Object.keys(MAY_USE).sort())
  })

  it('go one way', () => {
    expect(forbidden()).toEqual([])
  })
})
