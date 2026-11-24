// One pass with the keyboard alone: the nav, search, sort, paging, adding,
// editing and deleting, logging an activity and marking a follow-up done.
// Dialogs keep focus inside and give it back (SC 8, A11Y-1, FORM-1).
import type { Locator, Page } from '@playwright/test'
import { dialog, tableRows } from './crm/helpers'
import { apiGet, expect, resetData, test } from './support/fixtures'

/** Presses Tab until `target` has focus, as a keyboard user would reach it. */
async function tabTo(page: Page, target: Locator, max = 150) {
  for (let presses = 0; presses < max; presses++) {
    if (await target.evaluate((element) => element === document.activeElement).catch(() => false)) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`Tab never reached ${target}`)
}

/** Focus stays inside the dialog however many times Tab is pressed. */
async function expectFocusKeptIn(page: Page, box: Locator, presses = 12) {
  for (let index = 0; index < presses; index++) {
    await page.keyboard.press('Tab')
    expect(await box.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  }
}

test.beforeEach(() => resetData())

test('the tables: nav, search, sort and paging', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: '주 메뉴' })
  await tabTo(page, nav.getByRole('link', { name: '연락처' }))
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/contacts')

  const rows = tableRows(page, '연락처 목록')
  await expect(rows).toHaveCount(50)
  await tabTo(page, page.getByRole('searchbox', { name: '연락처 검색' }))
  await page.keyboard.type('김')
  await expect(page).toHaveURL(/q=/)
  const found = await rows.count()
  expect(found).toBeLessThan(50)
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await expect(rows).toHaveCount(50)

  const nameHeader = page.getByRole('columnheader', { name: /이름/ })
  await tabTo(page, nameHeader.getByRole('button'))
  await page.keyboard.press('Enter')
  await expect(nameHeader).toHaveAttribute('aria-sort', /ascending|descending/)
  const before = await nameHeader.getAttribute('aria-sort')
  await page.keyboard.press('Enter')
  await expect(nameHeader).not.toHaveAttribute('aria-sort', before!)

  await tabTo(page, page.getByRole('navigation', { name: '페이지' }).getByRole('button', { name: '다음' }))
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/page=2/)
})

test('adding, editing and deleting, with focus kept in each dialog and given back', async ({ page }) => {
  await page.goto('/organizations')
  const add = page.getByRole('button', { name: '거래처 추가' })
  await tabTo(page, add)
  await page.keyboard.press('Enter')
  // React Aria moves focus to the dialog itself, so its title is read out first.
  const addForm = dialog(page, '거래처 추가')
  await expect(addForm).toBeFocused()
  await expectFocusKeptIn(page, addForm)
  await tabTo(page, addForm.getByRole('textbox', { name: '이름 (필수)' }), 12)
  await page.keyboard.type('키보드상사')
  await page.keyboard.press('Enter')
  await expect(addForm).toBeHidden()
  await expect(add).toBeFocused()

  const menu = page.getByRole('button', { name: '키보드상사 메뉴' })
  await page.getByRole('searchbox', { name: '거래처 검색' }).focus()
  await page.keyboard.type('키보드상사')
  await tabTo(page, menu)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: '수정' })).toBeFocused()
  await page.keyboard.press('Enter')
  const editForm = dialog(page, '거래처 수정')
  await expect(editForm).toBeFocused()
  await tabTo(page, editForm.getByRole('textbox', { name: '이름 (필수)' }), 12)
  await page.keyboard.press('End')
  await page.keyboard.type(' 본사')
  await page.keyboard.press('Enter')
  await expect(editForm).toBeHidden()
  await expect(page.getByRole('status').getByText('저장했어요').last()).toBeVisible()
  const renamed = page.getByRole('button', { name: '키보드상사 본사 메뉴' })
  await expect(renamed).toBeFocused()

  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: '삭제' })).toBeFocused()
  await page.keyboard.press('Enter')
  const confirm = page.getByRole('alertdialog', { name: '삭제' })
  await expect(confirm.getByRole('button', { name: '취소' })).toBeFocused()
  await expectFocusKeptIn(page, confirm, 4)
  await tabTo(page, confirm.getByRole('button', { name: '삭제' }), 4)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').getByText('삭제했어요')).toBeVisible()
  const left = await apiGet<{ name: string }[]>('/api/organizations')
  expect(left.some((organization) => organization.name.startsWith('키보드상사'))).toBe(false)
})

test('logging an activity and marking a follow-up done', async ({ page }) => {
  const contact = (await apiGet<{ id: number }[]>('/api/contacts'))[0]
  await page.goto(`/contacts/${contact.id}`)
  const form = page.getByRole('form', { name: '활동 기록' })
  await tabTo(page, form.getByRole('radio', { name: '메모' }))
  // In React Aria's toggle button group the arrows move focus and Space picks.
  await page.keyboard.press('ArrowRight')
  await expect(form.getByRole('radio', { name: '통화' })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(form.getByRole('radio', { name: '통화' })).toBeChecked()
  await tabTo(page, form.getByRole('textbox', { name: '내용 (필수)' }))
  await page.keyboard.type('키보드로 남긴 통화 기록')
  await tabTo(page, form.getByRole('button', { name: '기록' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').getByText('기록했어요')).toBeVisible()
  await expect(page.getByRole('list', { name: '타임라인' }).getByRole('listitem').first()).toContainText(
    '키보드로 남긴 통화 기록',
  )

  await page.goto('/')
  const list = page.getByRole('list', { name: '후속 조치' })
  const first = list.getByRole('listitem').first()
  const text = await first.locator('label').innerText()
  await tabTo(page, first.getByRole('checkbox'))
  await page.keyboard.press('Space')
  await expect(page.getByRole('status').getByText('후속 조치를 완료했어요')).toBeVisible()
  await expect(list.getByRole('listitem').filter({ hasText: text.trim() })).toHaveCount(0)
})
