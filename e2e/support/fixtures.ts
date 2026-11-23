// The test fixture every end-to-end test uses. It fails a test on any console
// error or warning, any page error, or any request to a host other than
// 127.0.0.1 (APP-4, APP-12). It also has the data reset and the axe helper.
import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type CDPSession, type Page } from '@playwright/test'
import { API_URL, resetData } from './servers'

export { expect, resetData }

type Fixtures = {
  /** Console messages a test expects, such as a 503 while the backend is stopped. */
  allowConsole: RegExp[]
  watchProblems: void
}

const WEB_PROTOCOLS = new Set(['http:', 'https:', 'ws:', 'wss:'])

export const test = base.extend<Fixtures>({
  allowConsole: [[], { option: true }],
  watchProblems: [
    async ({ page, allowConsole }, use) => {
      const problems: string[] = []
      page.on('console', (message) => {
        const type = message.type()
        if (type !== 'error' && type !== 'warning') return
        const text = message.text()
        if (allowConsole.some((pattern) => pattern.test(text))) return
        const where = message.location().url
        problems.push(`console ${type}: ${text}${where ? ` (${where})` : ''}`)
      })
      page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
      page.on('request', (request) => {
        const url = new URL(request.url())
        if (WEB_PROTOCOLS.has(url.protocol) && url.hostname !== '127.0.0.1') {
          problems.push(`request to another host: ${request.url()}`)
        }
      })
      await use()
      expect(problems, 'console errors, page errors or requests that leave 127.0.0.1').toEqual([])
    },
    { auto: true },
  ],
})

/** GET from the test backend directly, for checking what the screens show. */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) throw new Error(`GET ${path}: ${response.status}`)
  return (await response.json()) as T
}

export async function apiSend<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`)
  return (response.status === 204 ? undefined : await response.json()) as T
}

/** Today as the backend sees it, YYYY-MM-DD. */
export async function today(): Promise<string> {
  return (await apiGet<{ today: string }>('/api/meta')).today
}

/** axe finds no WCAG 2.1 AA problems on the page as it is now (A11Y-7). */
export async function expectNoA11yViolations(
  page: Page,
  label = '',
  { disableRules = [] }: { disableRules?: string[] } = {},
): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(disableRules)
    .analyze()
  const summary = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join(', ')})`,
  )
  expect(summary, `axe violations ${label}`).toEqual([])
}

/**
 * The fonts Chrome actually drew the element's text with. `custom` is true for
 * a web font the page loaded, as opposed to one installed on the computer.
 */
export async function renderedFonts(
  page: Page,
  selector: string,
): Promise<{ family: string; custom: boolean }[]> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  const client: CDPSession = await page.context().newCDPSession(page)
  await client.send('DOM.enable')
  await client.send('CSS.enable')
  const { root } = await client.send('DOM.getDocument')
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector })
  const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId })
  await client.detach()
  return fonts.map((font) => ({ family: font.familyName, custom: font.isCustomFont }))
}
