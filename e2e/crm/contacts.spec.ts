// 연락처: the table and forms, plus the status filter, search by phone digits
// and the organization combobox by keyboard (SC 2, SC 3, TBL-7, FORM-3).
import { apiGet, expect, resetData, test } from '../support/fixtures'
import { dialog, rowAction, search, tableRows } from './helpers'

type Contact = {
  id: number
  name: string
  phone: string | null
  status: 'lead' | 'qualified' | 'customer'
  organization_id: number | null
  organization_name: string | null
}
type Deal = { id: number; contact_id: number | null }

test.beforeEach(() => resetData())

test('adds a contact, picking the organization by keyboard', async ({ page }) => {
  await page.goto('/contacts')
  await page.getByRole('button', { name: '연락처 추가' }).click()
  const form = dialog(page, '연락처 추가')
  await form.getByRole('textbox', { name: '이름 (필수)' }).fill('홍길동')
  await form.getByRole('textbox', { name: '이메일' }).fill('gildong@hanbit.example')
  await form.getByRole('textbox', { name: '전화번호' }).fill('010-5555-0101')
  await form.getByRole('textbox', { name: '직책' }).fill('구매 대리')
  const organization = form.getByRole('combobox', { name: '거래처' })
  await organization.focus()
  await page.keyboard.type('한빛')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(organization).toHaveValue('한빛정밀')
  await form.getByRole('button', { name: '저장' }).click()
  await expect(form).toBeHidden()

  await page.reload()
  await search(page, '연락처 검색', '홍길동')
  const row = tableRows(page, '연락처 목록').first()
  await expect(row).toContainText('리드')
  await expect(row).toContainText('구매 대리')
  await expect(row.getByRole('link', { name: '한빛정밀' })).toBeVisible()
})

test('an email address is checked when the field is left', async ({ page }) => {
  await page.goto('/contacts')
  await page.getByRole('button', { name: '연락처 추가' }).click()
  const form = dialog(page, '연락처 추가')
  await form.getByRole('textbox', { name: '이메일' }).fill('gildong@')
  await form.getByRole('textbox', { name: '전화번호' }).focus()
  await expect(form.getByText('올바른 이메일 주소가 아니에요')).toBeVisible()
})

test('the status filter shows its counts and keeps its choice in the address', async ({ page }) => {
  const contacts = await apiGet<Contact[]>('/api/contacts')
  const customers = contacts.filter((c) => c.status === 'customer').length
  await page.goto('/contacts')
  const filter = page.getByRole('radiogroup', { name: '상태' })
  for (const [label, key] of [['리드', 'lead'], ['적격', 'qualified'], ['고객', 'customer']] as const) {
    const n = contacts.filter((c) => c.status === key).length
    await expect(filter.getByRole('radio', { name: `${label} ${n}` })).toBeVisible()
  }
  await expect(filter.getByRole('radio', { name: `전체 ${contacts.length}` })).toBeChecked()

  await filter.getByRole('radio', { name: `고객 ${customers}` }).click()
  await expect(page).toHaveURL(/status=customer/)
  await expect(filter.getByRole('radio', { name: `고객 ${customers}` })).toBeChecked()
  const rows = tableRows(page, '연락처 목록')
  await expect(rows).toHaveCount(customers)
  for (const row of await rows.all()) await expect(row).toContainText('고객')

  await page.reload()
  await expect(rows).toHaveCount(customers)
})

test('finds a phone number by its digits alone', async ({ page }) => {
  const contact = (await apiGet<Contact[]>('/api/contacts')).find((c) => c.phone?.includes('-'))!
  await page.goto('/contacts')
  await search(page, '연락처 검색', contact.phone!.replace(/\D/g, ''))
  await expect(tableRows(page, '연락처 목록').filter({ hasText: contact.name })).toHaveCount(1)
})

test('pages through 50 at a time, kept in the address', async ({ page }) => {
  const contacts = await apiGet<Contact[]>('/api/contacts')
  await page.goto('/contacts')
  const rows = tableRows(page, '연락처 목록')
  await expect(rows).toHaveCount(50)
  await page.getByRole('navigation', { name: '페이지' }).getByRole('button', { name: '다음' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(rows).toHaveCount(contacts.length - 50)
  await page.reload()
  await expect(rows).toHaveCount(contacts.length - 50)
})

test('edits a contact from its row menu', async ({ page }) => {
  await page.goto('/contacts')
  await search(page, '연락처 검색', '박서연')
  await rowAction(page, '박서연', '수정')
  const form = dialog(page, '연락처 수정')
  await form.getByRole('textbox', { name: '직책' }).fill('구매본부장')
  await form.getByRole('button', { name: '저장' }).click()
  await expect(form).toBeHidden()
  await page.reload()
  await expect(tableRows(page, '연락처 목록').first()).toContainText('구매본부장')
})

test('deletes a contact, leaving their deals without a main contact', async ({ page }) => {
  const contact = (await apiGet<Contact[]>('/api/contacts')).find((c) => c.name === '박서연')!
  const impact = await apiGet<{ deals: number; activities: number }>(`/api/contacts/${contact.id}/delete-impact`)
  const dealIds = (await apiGet<Deal[]>('/api/deals')).filter((d) => d.contact_id === contact.id).map((d) => d.id)
  expect(dealIds.length).toBeGreaterThan(0)

  await page.goto('/contacts')
  await search(page, '연락처 검색', '박서연')
  await rowAction(page, '박서연', '삭제')
  const confirm = page.getByRole('alertdialog', { name: '삭제' })
  await expect(confirm).toContainText(`‘박서연’ 님을 삭제할까요? 영업 기회 ${impact.deals}건은 그대로 남고 주 연락처가 비워져요.`)
  if (impact.activities) await expect(confirm).toContainText(`이 연락처에 기록된 활동 ${impact.activities}건은 함께 삭제돼요.`)
  await confirm.getByRole('button', { name: '삭제' }).click()
  await expect(page.getByText('‘박서연’과 일치하는 결과가 없어요')).toBeVisible()

  const deals = await apiGet<Deal[]>('/api/deals')
  for (const id of dealIds) expect(deals.find((d) => d.id === id)?.contact_id).toBeNull()
})
