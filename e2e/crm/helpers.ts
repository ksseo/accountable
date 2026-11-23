// Small helpers the CRM screens' tests share.
import type { Locator, Page } from '@playwright/test'
import { expect } from '../support/fixtures'

/** The body rows of the table with this caption, such as "거래처 목록". */
export function tableRows(page: Page, caption: string): Locator {
  return page.getByRole('table', { name: caption }).locator('tbody tr')
}

/** Picks 수정 or 삭제 from a row's menu. */
export async function rowAction(page: Page, name: string, action: '수정' | '삭제'): Promise<void> {
  await page.getByRole('button', { name: `${name} 메뉴`, exact: true }).click()
  await page.getByRole('menuitem', { name: action }).click()
}

/** Types into the table's search field. */
export async function search(page: Page, label: string, text: string): Promise<void> {
  const box = page.getByRole('searchbox', { name: label })
  await box.fill(text)
  await expect(box).toHaveValue(text)
}

/** The dialog with this title. */
export function dialog(page: Page, title: string): Locator {
  return page.getByRole('dialog', { name: title })
}

/** The polite message area at the bottom of the page (UI-4). */
export function messages(page: Page): Locator {
  return page.getByRole('status').filter({ hasText: /./ }).last()
}
