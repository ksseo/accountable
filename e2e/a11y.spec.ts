// axe finds no WCAG 2.1 AA problems on any screen, with and without each
// dialog open (SC 8, A11Y-2, A11Y-3, A11Y-7, LOOK-4).
import type { Page } from '@playwright/test'
import { dialog, rowAction } from './crm/helpers'
import { apiGet, expect, expectNoA11yViolations, test } from './support/fixtures'

type Named = { id: number; name: string }

// The "찾을 수 없어요" page is checked too, and Chrome logs its 404.
test.use({ allowConsole: [/status of 404/] })

async function open(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1')).not.toHaveText(/^\s*$/)
}

test('every screen', async ({ page }) => {
  const [organization] = await apiGet<Named[]>('/api/organizations')
  const [contact] = await apiGet<Named[]>('/api/contacts')
  const [deal] = await apiGet<Named[]>('/api/deals')
  for (const path of [
    '/',
    '/organizations',
    '/contacts',
    '/deals',
    '/deals?late=1',
    '/pipeline',
    `/organizations/${organization.id}`,
    `/contacts/${contact.id}`,
    `/deals/${deal.id}`,
    '/organizations/999999',
  ]) {
    await open(page, path)
    await expectNoA11yViolations(page, path)
  }
})

test('the dashboard with every chart shown as a table', async ({ page }) => {
  await open(page, '/')
  for (const toggle of await page.getByRole('button', { name: '표로 보기' }).all()) await toggle.click()
  await expect(page.getByRole('table')).toHaveCount(3)
  await expectNoA11yViolations(page, 'dashboard tables')
})

test('the add and edit dialogs, the date picker and the delete question', async ({ page }) => {
  await open(page, '/organizations')
  await page.getByRole('button', { name: '거래처 추가' }).click()
  await expect(dialog(page, '거래처 추가')).toBeVisible()
  await expectNoA11yViolations(page, 'add organization')
  await dialog(page, '거래처 추가').getByRole('textbox', { name: '이름 (필수)' }).fill('다온물류센터')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog', { name: '저장하지 않고 닫을까요?' })).toBeVisible()
  await expectNoA11yViolations(page, 'question about typed text')
  await page.getByRole('button', { name: '버리기' }).click()

  const [organization] = await apiGet<Named[]>('/api/organizations')
  await rowAction(page, organization.name, '수정')
  await expect(dialog(page, '거래처 수정')).toBeVisible()
  await expectNoA11yViolations(page, 'edit organization')
  await page.keyboard.press('Escape')

  await rowAction(page, organization.name, '삭제')
  await expect(page.getByRole('alertdialog', { name: '삭제' })).toContainText('삭제할까요?')
  await expectNoA11yViolations(page, 'delete question')
  await page.keyboard.press('Escape')

  await open(page, '/contacts')
  await page.getByRole('button', { name: '연락처 추가' }).click()
  await expect(dialog(page, '연락처 추가')).toBeVisible()
  await expectNoA11yViolations(page, 'add contact')
  await page.keyboard.press('Escape')

  await page.getByRole('banner').getByRole('button', { name: '영업 기회 추가' }).click()
  const dealForm = dialog(page, '영업 기회 추가')
  await expect(dealForm).toBeVisible()
  await expectNoA11yViolations(page, 'add deal')
  await dealForm.getByRole('button', { name: '마감일 달력 열기' }).click()
  await expect(page.getByRole('dialog', { name: '마감일 선택' })).toBeVisible()
  // React Aria names each day cell with the whole date ("2026년 11월 1일 일요일")
  // while it shows "1". In Korean the day is written "1일", so axe's
  // label-in-name rule can't find "1" as a word. Only this rule, only here.
  await expectNoA11yViolations(page, 'date picker', { disableRules: ['label-content-name-mismatch'] })
})

test('a record page with the activity edit dialog and a card menu on the board', async ({ page }) => {
  const contacts = await apiGet<Named[]>('/api/contacts')
  let withNote: Named | undefined
  for (const contact of contacts) {
    const timeline = await apiGet<{ items: { automatic: boolean }[] }>(`/api/contacts/${contact.id}/timeline`)
    if (timeline.items.some((entry) => !entry.automatic)) {
      withNote = contact
      break
    }
  }
  await open(page, `/contacts/${withNote!.id}`)
  const entry = page
    .getByRole('list', { name: '타임라인' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: /메뉴$/ }) })
  await entry.first().getByRole('button', { name: /메뉴$/ }).click()
  await page.getByRole('menuitem', { name: '수정' }).click()
  await expect(dialog(page, '활동 수정')).toBeVisible()
  await expectNoA11yViolations(page, 'edit activity')
  await page.keyboard.press('Escape')

  await open(page, '/pipeline')
  await page
    .getByRole('region', { name: '파이프라인 보드' })
    .getByRole('button', { name: /메뉴$/ })
    .first()
    .click()
  await expect(page.getByRole('menu')).toBeVisible()
  await expectNoA11yViolations(page, 'card menu')
})
