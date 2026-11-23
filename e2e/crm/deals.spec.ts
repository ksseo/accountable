// 영업 기회: the table and form, plus the late switch and badge, the money
// field, the Korean date picker and the fields the form fills in
// (SC 2, TBL-8, FORM-4 to FORM-6). The dashboard's late figure is in dashboard.spec.ts.
import { apiGet, expect, resetData, test, today } from '../support/fixtures'
import { dialog, rowAction, search, tableRows } from './helpers'

type Deal = { id: number; name: string; value: number; is_late: boolean; stage: string }
type Contact = { id: number; name: string; status: string; organization_id: number | null; organization_name: string | null }

const koreanDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('ko-KR').format(new Date(year, month - 1, day))
}

const addDays = (iso: string, days: number) => {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

test.beforeEach(() => resetData())

test('adds a deal from the top bar with the money field, the date picker and the filled-in fields', async ({ page }) => {
  const contact = (await apiGet<Contact[]>('/api/contacts')).find((c) => c.organization_id !== null)!
  const closeDate = addDays(await today(), 40)
  await page.goto('/contacts')
  await page.getByRole('banner').getByRole('button', { name: '영업 기회 추가' }).click()
  const form = dialog(page, '영업 기회 추가')

  await form.getByRole('textbox', { name: '이름 (필수)' }).fill('라벨 인쇄 설비 교체')
  const value = form.getByRole('textbox', { name: '금액 (필수)' })
  await value.fill('12500')
  await value.blur()
  await expect(value).toHaveValue('$12,500')

  const contactBox = form.getByRole('combobox', { name: '주 연락처' })
  await contactBox.fill(contact.name)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(form.getByRole('combobox', { name: '거래처' })).toHaveValue(contact.organization_name!)

  await form.getByRole('button', { name: /단계/ }).click()
  await page.getByRole('option', { name: '협상' }).click()
  await expect(form.getByRole('textbox', { name: '확률' })).toHaveValue('75')

  const [year, month, day] = closeDate.split('-')
  const dateGroup = form.getByRole('group', { name: '마감일' })
  await dateGroup.getByRole('spinbutton', { name: /^년/ }).click()
  await page.keyboard.type(`${year}${month}${day}`)
  await expect(dateGroup).toContainText(koreanDate(closeDate))

  await form.getByRole('button', { name: '저장' }).click()
  await expect(form).toBeHidden()
  await expect(page.getByRole('status').getByText('저장했어요')).toBeVisible()

  await page.goto('/deals')
  await page.reload()
  await search(page, '영업 기회 검색', '라벨 인쇄')
  const row = tableRows(page, '영업 기회 목록').first()
  await expect(row).toContainText('협상')
  await expect(row).toContainText('$12,500')
  await expect(row).toContainText('75%')
  await expect(row).toContainText('$9,375')
  await expect(row).toContainText(koreanDate(closeDate))
  await expect(row.getByRole('link', { name: contact.name })).toBeVisible()
})

test('choosing Won fills in today, makes the contact a customer and says so', async ({ page }) => {
  const lead = (await apiGet<Contact[]>('/api/contacts')).find((c) => c.status === 'lead')!
  const now = await today()
  await page.goto('/deals')
  await page.getByRole('banner').getByRole('button', { name: '영업 기회 추가' }).click()
  const form = dialog(page, '영업 기회 추가')
  await form.getByRole('textbox', { name: '이름 (필수)' }).fill('긴급 납품 건')
  await form.getByRole('textbox', { name: '금액 (필수)' }).fill('$3,000')
  await form.getByRole('combobox', { name: '주 연락처' }).fill(lead.name)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await form.getByRole('button', { name: /단계/ }).click()
  await page.getByRole('option', { name: '수주' }).click()
  await expect(form.getByRole('textbox', { name: '확률' })).toHaveValue('100')
  await expect(form.getByRole('group', { name: '마감일' })).toContainText(koreanDate(now))
  await form.getByRole('button', { name: '저장' }).click()

  await expect(page.getByRole('status').getByText(`${lead.name} 님이 고객이 되었어요`)).toBeVisible()
  const saved = await apiGet<Contact>(`/api/contacts/${lead.id}`)
  expect(saved.status).toBe('customer')
})

test('the late switch shows only late deals, each with its badge', async ({ page }) => {
  const late = (await apiGet<Deal[]>('/api/deals')).filter((deal) => deal.is_late)
  expect(late.length).toBeGreaterThan(0)
  await page.goto('/deals')
  // The switch's input is hidden under its drawing; people click the label.
  await page.getByText('지연된 것만').click()
  await expect(page).toHaveURL(/late=1/)
  const rows = tableRows(page, '영업 기회 목록')
  await expect(rows).toHaveCount(late.length)
  for (const row of await rows.all()) await expect(row.getByText('지연', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('switch', { name: /지연된 것만/ })).toBeChecked()
  await expect(rows).toHaveCount(late.length)
})

test('sorts by value, largest first on the second click', async ({ page }) => {
  const deals = await apiGet<Deal[]>('/api/deals')
  await page.goto('/deals')
  const valueHeader = page.getByRole('columnheader', { name: /금액/ })
  await valueHeader.getByRole('button').click()
  await valueHeader.getByRole('button').click()
  await expect(valueHeader).toHaveAttribute('aria-sort', 'descending')
  const largest = Math.max(...deals.map((deal) => deal.value))
  await expect(tableRows(page, '영업 기회 목록').first()).toContainText(`$${largest.toLocaleString('en-US')}`)
})

test('edits a deal from its row menu', async ({ page }) => {
  await page.goto('/deals')
  await search(page, '영업 기회 검색', '반도체 장비 부품 납품')
  await rowAction(page, '반도체 장비 부품 납품', '수정')
  const form = dialog(page, '영업 기회 수정')
  const value = form.getByRole('textbox', { name: '금액 (필수)' })
  await value.fill('99,000')
  await form.getByRole('button', { name: '저장' }).click()
  await expect(form).toBeHidden()
  await page.reload()
  await expect(tableRows(page, '영업 기회 목록').first()).toContainText('$99,000')
})

test('deletes a deal, saying its activities go with it', async ({ page }) => {
  const deal = (await apiGet<Deal[]>('/api/deals')).find((d) => d.name === '반도체 장비 부품 납품')!
  const impact = await apiGet<{ activities: number }>(`/api/deals/${deal.id}/delete-impact`)
  await page.goto('/deals')
  await search(page, '영업 기회 검색', deal.name)
  await rowAction(page, deal.name, '삭제')
  const confirm = page.getByRole('alertdialog', { name: '삭제' })
  await expect(confirm).toContainText(
    `‘${deal.name}’을 삭제할까요? 이 영업 기회에 기록된 활동 ${impact.activities}건(단계 변경 기록 포함)이 함께 삭제돼요.`,
  )
  await confirm.getByRole('button', { name: '삭제' }).click()
  await expect(page.getByText(`‘${deal.name}’과 일치하는 결과가 없어요`)).toBeVisible()
  await page.reload()
  await expect(page.getByText(`‘${deal.name}’과 일치하는 결과가 없어요`)).toBeVisible()
})
