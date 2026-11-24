// 거래처: add, search, sort, edit and delete, each still there after a refresh
// (SC 2, TBL, FORM-1, DEL-1, DEL-2, UI-4).
import { apiGet, expect, resetData, test } from '../support/fixtures'
import { dialog, rowAction, search, tableRows } from './helpers'

type Org = { id: number; name: string; industry: string | null; contact_count: number }
type Contact = { id: number; organization_id: number | null }
type Deal = { id: number; organization_id: number | null }

test.beforeEach(() => resetData())

test('adds an organization, which is still there after a refresh', async ({ page }) => {
  await page.goto('/organizations')
  await page.getByRole('button', { name: '거래처 추가' }).click()
  const form = dialog(page, '거래처 추가')
  await form.getByRole('textbox', { name: '이름 (필수)' }).fill('새한포장')
  await form.getByRole('combobox', { name: '업종' }).fill('포장재')
  await form.getByRole('textbox', { name: '웹사이트' }).fill('saehan.example')
  await form.getByRole('button', { name: '저장' }).click()
  await expect(form).toBeHidden()
  await expect(page.getByRole('status').getByText('저장했어요')).toBeVisible()

  await page.reload()
  await search(page, '거래처 검색', '새한')
  const rows = tableRows(page, '거래처 목록')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('새한포장')
  await expect(rows.first()).toContainText('포장재')
  await expect(rows.first().getByRole('link', { name: 'saehan.example' })).toHaveAttribute(
    'href',
    'https://saehan.example',
  )
})

test('a name is required, said in Korean under the field', async ({ page }) => {
  await page.goto('/organizations')
  await page.getByRole('button', { name: '거래처 추가' }).click()
  const form = dialog(page, '거래처 추가')
  await form.getByRole('button', { name: '저장' }).click()
  await expect(form.getByText('이름을 입력해 주세요')).toBeVisible()
  await expect(form.getByRole('textbox', { name: '이름 (필수)' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(form).toBeHidden()
})

test('searches and sorts, kept in the address', async ({ page }) => {
  const orgs = await apiGet<Org[]>('/api/organizations')
  await page.goto('/organizations')
  const rows = tableRows(page, '거래처 목록')
  await expect(rows).toHaveCount(orgs.length)

  await search(page, '거래처 검색', '정밀')
  await expect(page).toHaveURL(/q=%EC%A0%95%EB%B0%80/)
  const precise = orgs.filter((org) => org.name.includes('정밀') || org.industry?.includes('정밀'))
  await expect(rows).toHaveCount(precise.length)

  await search(page, '거래처 검색', '')
  const nameHeader = page.getByRole('columnheader', { name: /이름/ })
  await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
  await nameHeader.getByRole('button').click()
  await expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
  const sorted = orgs.map((org) => org.name).sort(new Intl.Collator('ko').compare)
  await expect(rows.first().getByRole('link').first()).toHaveText(sorted[sorted.length - 1])

  await page.reload()
  await expect(page.getByRole('columnheader', { name: /이름/ })).toHaveAttribute('aria-sort', 'descending')
  await expect(rows.first().getByRole('link').first()).toHaveText(sorted[sorted.length - 1])

  await page
    .getByRole('columnheader', { name: /연락처 수/ })
    .getByRole('button')
    .click()
  const fewest = Math.min(...orgs.map((org) => org.contact_count))
  await expect(rows.first()).toContainText(`${fewest}명`)
})

test('edits an organization from its row menu', async ({ page }) => {
  await page.goto('/organizations')
  await rowAction(page, '한빛정밀', '수정')
  const form = dialog(page, '거래처 수정')
  await expect(form.getByRole('textbox', { name: '이름 (필수)' })).toHaveValue('한빛정밀')
  await form.getByRole('textbox', { name: '비고' }).fill('연간 계약 갱신 협의 중')
  await form.getByRole('combobox', { name: '업종' }).fill('정밀 가공')
  await form.getByRole('button', { name: '저장' }).click()
  await expect(form).toBeHidden()

  await page.reload()
  await search(page, '거래처 검색', '한빛정밀')
  await expect(tableRows(page, '거래처 목록').first()).toContainText('정밀 가공')
})

test('deletes an organization, leaving its contacts and deals without it', async ({ page }) => {
  const org = (await apiGet<Org[]>('/api/organizations')).find((item) => item.name === '한빛정밀')!
  const impact = await apiGet<{ contacts: number; deals: number }>(
    `/api/organizations/${org.id}/delete-impact`,
  )
  const contactIds = (await apiGet<Contact[]>('/api/contacts'))
    .filter((c) => c.organization_id === org.id)
    .map((c) => c.id)
  const dealIds = (await apiGet<Deal[]>('/api/deals'))
    .filter((d) => d.organization_id === org.id)
    .map((d) => d.id)
  expect(contactIds).toHaveLength(impact.contacts)

  await page.goto('/organizations')
  await rowAction(page, '한빛정밀', '삭제')
  const confirm = page.getByRole('alertdialog', { name: '삭제' })
  await expect(confirm).toContainText(
    `‘한빛정밀’을 삭제할까요? 연락처 ${impact.contacts}명과 영업 기회 ${impact.deals}건은 그대로 남고, 거래처 연결만 해제돼요.`,
  )
  await expect(confirm.getByRole('button', { name: '취소' })).toBeFocused()
  await confirm.getByRole('button', { name: '삭제' }).click()
  await expect(confirm).toBeHidden()
  await expect(page.getByRole('status').getByText('삭제했어요')).toBeVisible()

  await page.reload()
  await search(page, '거래처 검색', '한빛정밀')
  await expect(page.getByText('‘한빛정밀’과 일치하는 결과가 없어요')).toBeVisible()

  const contacts = await apiGet<Contact[]>('/api/contacts')
  const deals = await apiGet<Deal[]>('/api/deals')
  for (const id of contactIds) expect(contacts.find((c) => c.id === id)?.organization_id).toBeNull()
  for (const id of dealIds) expect(deals.find((d) => d.id === id)?.organization_id).toBeNull()
})

test('clicking a row opens the organization', async ({ page }) => {
  await page.goto('/organizations')
  await search(page, '거래처 검색', '한빛정밀')
  await tableRows(page, '거래처 목록').first().locator('td').nth(3).click()
  await expect(page).toHaveURL(/\/organizations\/\d+$/)
  await expect(page.getByRole('heading', { level: 1, name: '한빛정밀' })).toBeVisible()
})
