// Data survives the backend restarting; while it's down the banner shows and
// the page recovers by itself; the seed command brings the sample back
// (SC 2, APP-6, APP-10, UI-5).
import { dialog, search, tableRows } from './crm/helpers'
import { apiGet, apiSend, expect, resetData, test } from './support/fixtures'
import { startBackend, stopBackend } from './support/servers'

// While the backend is down, Vite's proxy answers 503 and Chrome logs it.
test.use({ allowConsole: [/status of 503/] })

test.beforeEach(() => resetData())

test('a change is still there after the backend restarts, and the page recovers by itself', async ({ page }) => {
  await page.goto('/organizations')
  await page.getByRole('button', { name: '거래처 추가' }).click()
  const form = dialog(page, '거래처 추가')
  await form.getByRole('textbox', { name: '이름 (필수)' }).fill('다온물류센터')
  await form.getByRole('button', { name: '저장' }).click()
  await expect(form).toBeHidden()

  await stopBackend()
  try {
    await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '연락처' }).click()
    await expect(page.getByRole('alert')).toContainText('서버에 연결할 수 없어요')
  } finally {
    await startBackend()
  }
  await expect(page.getByRole('alert')).toBeHidden({ timeout: 15_000 })
  await expect(tableRows(page, '연락처 목록').first()).toBeVisible()

  await page.goto('/organizations')
  await search(page, '거래처 검색', '다온물류')
  await expect(tableRows(page, '거래처 목록')).toHaveCount(1)
  await expect(tableRows(page, '거래처 목록').first()).toContainText('다온물류센터')
})

test('the seed command brings the sample back', async () => {
  const before = await apiGet<{ id: number; name: string }[]>('/api/organizations')
  const added = await apiSend<{ id: number }>('POST', '/api/organizations', { name: '시드 확인용 거래처' })
  await apiSend('DELETE', `/api/organizations/${before[0].id}`)

  resetData()
  const after = await apiGet<{ id: number; name: string }[]>('/api/organizations')
  expect(after).toHaveLength(before.length)
  expect(after.some((organization) => organization.name === '시드 확인용 거래처')).toBe(false)
  expect(after.map((organization) => organization.name).sort()).toEqual(before.map((organization) => organization.name).sort())
  expect(added.id).toBeGreaterThan(0)
})
