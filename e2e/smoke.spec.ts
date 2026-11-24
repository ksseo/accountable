import { tableRows } from './crm/helpers'
import { apiGet, expect, renderedFonts, resetData, test } from './support/fixtures'

const SECTIONS = [
  { label: '대시보드', path: '/' },
  { label: '거래처', path: '/organizations' },
  { label: '연락처', path: '/contacts' },
  { label: '영업 기회', path: '/deals' },
  { label: '파이프라인', path: '/pipeline' },
]

test('opens on the dashboard, in Korean, in Noto Sans KR', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: '대시보드' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
  await expect(page).toHaveTitle(/대시보드/)

  // The bundled files name the family "Noto Sans KR Thin ..." inside. Checking
  // `custom` makes sure it's the bundled font, not one installed on the computer.
  for (const selector of ['h1', 'nav a']) {
    const fonts = await renderedFonts(page, selector)
    expect(fonts.length).toBeGreaterThan(0)
    for (const font of fonts) {
      expect(font.family).toMatch(/^Noto Sans KR/)
      expect(font.custom).toBe(true)
    }
  }
})

test('the top bar has the five sections and marks the current one', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: '주 메뉴' })
  await expect(nav.getByRole('link')).toHaveText(SECTIONS.map((s) => s.label))
  await expect(page.getByRole('button', { name: '영업 기회 추가' })).toBeVisible()

  for (const section of SECTIONS) {
    await nav.getByRole('link', { name: section.label }).click()
    await expect(page).toHaveURL(section.path)
    await expect(page.getByRole('heading', { level: 1, name: section.label })).toBeVisible()
    await expect(nav.locator('[aria-current="page"]')).toHaveText(section.label)
  }
})

test('losing the internet while the app is open changes nothing (APP-4)', async ({ page }) => {
  resetData()
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: '대시보드' })).toBeVisible()
  // What the browser says when the network goes away. The backend is on this computer.
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  const nav = page.getByRole('navigation', { name: '주 메뉴' })
  await nav.getByRole('link', { name: '거래처' }).click()
  await expect(tableRows(page, '거래처 목록').first()).toBeVisible()
  await nav.getByRole('link', { name: '파이프라인' }).click()

  const card = page.locator('section[aria-labelledby="lane-new"] [data-card-id]').first()
  const id = await card.getAttribute('data-card-id')
  await card.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await expect.poll(() => apiGet<{ stage: string }>(`/api/deals/${id}`).then((deal) => deal.stage)).toBe('qualified')
  await expect(page.getByRole('status').getByText('적격 단계로 옮겼어요')).toBeVisible()
  await expect(page.locator(`section[aria-labelledby="lane-qualified"] [data-card-id="${id}"]`)).toBeVisible()
})

test('every section has the sample data in it', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: '진행 중 파이프라인' })).toContainText('$')
  await expect(page.getByRole('list', { name: '최근 활동' }).getByRole('listitem')).toHaveCount(10)

  for (const [path, caption] of [
    ['/organizations', '거래처 목록'],
    ['/contacts', '연락처 목록'],
    ['/deals', '영업 기회 목록'],
  ]) {
    await page.goto(path)
    const rows = page.getByRole('table', { name: caption }).locator('tbody tr')
    await expect(rows.first()).toBeVisible()
    expect(await rows.count(), path).toBeGreaterThan(10)
  }

  await page.goto('/pipeline')
  for (const lane of ['신규', '적격', '제안', '협상', '수주', '실주']) {
    const section = page.locator('section', { has: page.getByRole('heading', { level: 2, name: lane, exact: true }) })
    await expect(section.locator('[data-card-id]').first(), lane).toBeVisible()
  }
})
