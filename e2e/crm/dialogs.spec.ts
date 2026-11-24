// What's been typed in a form isn't lost by accident (FORM-1).
import { apiGet, expect, resetData, test } from '../support/fixtures'
import type { Locator, Page } from '@playwright/test'
import { dialog } from './helpers'

test.beforeAll(() => resetData())

const question = (page: Page) => page.getByRole('alertdialog', { name: '저장하지 않고 닫을까요?' })

/** Types in a field, then presses Escape twice: once to go back, once to throw it away. */
async function expectAsked(page: Page, form: Locator, field: Locator): Promise<void> {
  await field.fill('입력하던 내용')
  await page.keyboard.press('Escape')
  await expect(question(page)).toContainText('입력한 내용이 사라져요.')
  await expect(question(page).getByRole('button', { name: '계속 입력' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(question(page)).toBeHidden()
  await expect(field).toHaveValue('입력하던 내용')
  await expect(field).toBeFocused()

  await page.keyboard.press('Escape')
  await question(page).getByRole('button', { name: '버리기' }).click()
  await expect(question(page)).toBeHidden()
  await expect(form).toBeHidden()
}

for (const { path, title } of [
  { path: '/organizations', title: '거래처 추가' },
  { path: '/contacts', title: '연락처 추가' },
  { path: '/', title: '영업 기회 추가' },
]) {
  test(`Escape asks before it throws away what was typed: ${title}`, async ({ page }) => {
    await page.goto(path)
    const opener = page.getByRole('button', { name: title }).first()
    const form = dialog(page, title)
    const name = form.getByRole('textbox', { name: '이름 (필수)' })

    // Nothing typed, nothing to ask.
    await opener.press('Enter')
    await expect(name).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(form).toBeHidden()
    await expect(opener).toBeFocused()

    await opener.press('Enter')
    await expectAsked(page, form, name)
    await expect(opener).toBeFocused()

    // 닫기 and 취소 are chosen, so they close at once.
    for (const button of ['닫기', '취소']) {
      await opener.press('Enter')
      await name.fill('입력하던 내용')
      await form.getByRole('button', { name: button }).click()
      await expect(question(page)).toBeHidden()
      await expect(form).toBeHidden()
    }
  })
}

test('Escape asks before it throws away a change to an activity', async ({ page }) => {
  for (const contact of await apiGet<{ id: number }[]>('/api/contacts')) {
    const timeline = await apiGet<{ items: { automatic: boolean }[] }>(`/api/contacts/${contact.id}/timeline`)
    if (!timeline.items.some((entry) => !entry.automatic)) continue
    await page.goto(`/contacts/${contact.id}`)
    break
  }
  await page.getByRole('list', { name: '타임라인' }).getByRole('button', { name: /메뉴$/ }).first().click()
  await page.getByRole('menuitem', { name: '수정' }).click()
  const form = dialog(page, '활동 수정')
  await expectAsked(page, form, form.getByRole('textbox', { name: '내용 (필수)' }))
})

test('a click outside keeps the form and what was typed', async ({ page }) => {
  await page.goto('/contacts')
  await page.getByRole('button', { name: '연락처 추가' }).click()
  const name = dialog(page, '연락처 추가').getByRole('textbox', { name: '이름 (필수)' })
  await name.fill('입력하던 내용')
  await page.mouse.click(10, 10)
  await page.waitForTimeout(300)
  await expect(name).toHaveValue('입력하던 내용')
})

test('Escape closes an open list first, and the form stays', async ({ page }) => {
  await page.goto('/contacts')
  await page.getByRole('button', { name: '연락처 추가' }).click()
  const form = dialog(page, '연락처 추가')
  await form.getByRole('textbox', { name: '이름 (필수)' }).fill('입력하던 내용')
  await form.getByRole('button', { name: /상태/ }).click()
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toBeHidden()
  await expect(question(page)).toBeHidden()
  await expect(form).toBeVisible()
})
