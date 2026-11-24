// Record pages and timelines: the linked records on each page, logging,
// editing, finishing and deleting activities, automatic entries, record names
// as links, and deleting from a record's page (SC 3, SC 5, REC-1 to REC-6, DEL-3, UI-7).
import type { Locator, Page } from '@playwright/test'
import { formatDateWithWeekday } from '../../frontend/src/lib/dates'
import { formatMoney } from '../../frontend/src/lib/money'
import { apiGet, apiSend, expect, resetData, test, today } from '../support/fixtures'

type Stage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
type Deal = {
  id: number
  name: string
  stage: Stage
  probability: number
  organization_id: number | null
  organization_name: string | null
  contact_id: number | null
  contact_name: string | null
}
type OrganizationRow = { id: number; name: string; contact_count: number }
type OrganizationDetail = {
  id: number
  name: string
  website: string | null
  contacts: { id: number; name: string }[]
  deals: { id: number; name: string }[]
  open_deal_value: number
  won_value: number
}
type ContactDetail = {
  id: number
  name: string
  email: string | null
  organization_id: number | null
  organization_name: string | null
  deals: { id: number; name: string }[]
}
type Entry = {
  id: number
  kind: string
  automatic: boolean
  description: string | null
  follow_up_date: string | null
  follow_up_done: boolean
  deal_id: number | null
}
type TimelinePage = { items: Entry[]; total: number }

const addDays = (iso: string, days: number) => {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

const timeline = (page: Page): Locator => page.getByRole('list', { name: '타임라인' }).getByRole('listitem')

const toastText = (page: Page, text: string | RegExp) => page.getByRole('status').getByText(text)

async function logActivity(page: Page, kind: '메모' | '통화' | '이메일', text: string, followUp?: string) {
  const form = page.getByRole('form', { name: '활동 기록' })
  await form.getByRole('radio', { name: kind }).click()
  await form.getByRole('textbox', { name: '내용 (필수)' }).fill(text)
  if (followUp) {
    const [year, month, day] = followUp.split('-')
    await form.getByRole('group', { name: '후속 조치' }).getByRole('spinbutton', { name: /^년/ }).click()
    await page.keyboard.type(`${year}${month}${day}`)
  }
  await form.getByRole('button', { name: '기록' }).click()
  await expect(form.getByRole('textbox', { name: '내용 (필수)' })).toHaveValue('')
}

async function openEntryMenu(page: Page, entry: Locator, action: '수정' | '삭제') {
  await entry.getByRole('button', { name: /메뉴$/ }).click()
  await page.getByRole('menuitem', { name: action }).click()
}

test.beforeEach(() => resetData())

test('an organization page shows its details, figures, contacts and deals, each name a link', async ({ page }) => {
  const rows = (await apiGet<OrganizationRow[]>('/api/organizations')).sort((a, b) => b.contact_count - a.contact_count)
  let organization: OrganizationDetail | undefined
  for (const row of rows) {
    const detail = await apiGet<OrganizationDetail>(`/api/organizations/${row.id}`)
    if (detail.website && detail.contacts.length > 1 && detail.deals.length > 1) {
      organization = detail
      break
    }
  }
  expect(organization, 'an organization with a website, contacts and deals').toBeDefined()
  const org = organization!

  await page.goto(`/organizations/${org.id}`)
  await expect(page.getByRole('heading', { level: 1, name: org.name })).toBeVisible()
  const website = page.getByRole('link', { name: /새 탭에서 열림/ })
  await expect(website).toHaveAttribute('href', org.website!)
  await expect(website).toHaveAttribute('target', '_blank')
  await expect(page.locator('dl').filter({ hasText: '진행 중 파이프라인' })).toContainText(formatMoney(org.open_deal_value))
  await expect(page.locator('dl').filter({ hasText: '수주 매출' })).toContainText(formatMoney(org.won_value))

  const contacts = page.getByRole('list', { name: `연락처 ${org.contacts.length}명` })
  for (const contact of org.contacts) {
    await expect(contacts.getByRole('link', { name: contact.name, exact: true })).toHaveAttribute('href', `/contacts/${contact.id}`)
  }
  const deals = page.getByRole('list', { name: `영업 기회 ${org.deals.length}건` })
  for (const deal of org.deals) {
    await expect(deals.getByRole('link', { name: deal.name, exact: true })).toHaveAttribute('href', `/deals/${deal.id}`)
  }

  await contacts.getByRole('link', { name: org.contacts[0].name, exact: true }).click()
  await expect(page).toHaveURL(`/contacts/${org.contacts[0].id}`)
  await expect(page.getByRole('heading', { level: 1, name: org.contacts[0].name })).toBeVisible()
})

test('a deal moved by its stage selector shows on its main contact’s timeline, with links both ways', async ({ page }) => {
  const deal = (await apiGet<Deal[]>('/api/deals')).find(
    (d) => d.stage === 'proposal' && d.contact_id !== null && d.organization_id !== null,
  )!
  const contact = await apiGet<ContactDetail>(`/api/contacts/${deal.contact_id}`)

  await page.goto(`/contacts/${contact.id}`)
  await expect(page.getByRole('heading', { level: 1, name: contact.name })).toBeVisible()
  if (contact.email) await expect(page.getByRole('link', { name: contact.email })).toHaveAttribute('href', `mailto:${contact.email}`)
  await expect(page.getByRole('main').getByRole('link', { name: contact.organization_name!, exact: true }).first()).toHaveAttribute(
    'href',
    `/organizations/${contact.organization_id}`,
  )
  const deals = page.getByRole('list', { name: /^주 연락처로 있는 영업 기회/ })
  for (const item of contact.deals) await expect(deals.getByRole('link', { name: item.name, exact: true })).toBeVisible()
  await deals.getByRole('link', { name: deal.name, exact: true }).click()

  await expect(page).toHaveURL(`/deals/${deal.id}`)
  await page.getByRole('button', { name: /단계/ }).click()
  await page.getByRole('option', { name: '협상' }).click()
  await expect(toastText(page, /협상 단계로 옮겼어요/)).toBeVisible()
  await expect(page.locator('dl').filter({ hasText: '확률' })).toContainText('75%')
  await expect(timeline(page).first()).toContainText('단계 변경')
  await expect(timeline(page).first()).toContainText('제안 → 협상')

  const moved = await apiGet<Deal>(`/api/deals/${deal.id}`)
  expect([moved.stage, moved.probability]).toEqual(['negotiation', 75])
  const pipeline = await apiGet<{ columns: { stage: Stage; deals: { id: number }[] }[] }>('/api/pipeline')
  expect(pipeline.columns.find((column) => column.stage === 'negotiation')!.deals[0].id).toBe(deal.id)

  await page.reload()
  await expect(page.getByRole('button', { name: /단계/ })).toContainText('협상')
  await page.getByRole('main').getByRole('link', { name: contact.name, exact: true }).first().click()
  await expect(page).toHaveURL(`/contacts/${contact.id}`)
  const latest = timeline(page).first()
  await expect(latest).toContainText('제안 → 협상')
  await latest.getByRole('link', { name: deal.name, exact: true }).click()
  await expect(page).toHaveURL(`/deals/${deal.id}`)
})

test('logs a note, a call with a follow-up and an email, newest first, and keeps them after a refresh', async ({ page }) => {
  const contact = (await apiGet<{ id: number }[]>('/api/contacts'))[0]
  const followUp = addDays(await today(), 3)
  await page.goto(`/contacts/${contact.id}`)

  await logActivity(page, '메모', '연간 단가 협의 내용 정리')
  await expect(toastText(page, '기록했어요')).toBeVisible()
  await logActivity(page, '통화', '견적서 수정본 요청', followUp)
  await logActivity(page, '이메일', '수정 견적서 발송')

  const check = async () => {
    await expect(timeline(page).nth(0)).toContainText('이메일')
    await expect(timeline(page).nth(0)).toContainText('수정 견적서 발송')
    await expect(timeline(page).nth(1)).toContainText('통화')
    await expect(timeline(page).nth(1)).toContainText(`후속 조치 ${formatDateWithWeekday(followUp)}`)
    await expect(timeline(page).nth(2)).toContainText('메모')
    await expect(timeline(page).nth(2)).toContainText('연간 단가 협의 내용 정리')
  }
  await check()
  await page.reload()
  await check()

  const saved = (await apiGet<TimelinePage>(`/api/contacts/${contact.id}/timeline`)).items.slice(0, 3)
  expect(saved.map((entry) => entry.kind)).toEqual(['email', 'call', 'note'])
  expect(saved[1].follow_up_date).toBe(followUp)
})

test('a note logged just after a stage change is above it', async ({ page }) => {
  const deal = (await apiGet<Deal[]>('/api/deals')).find((d) => d.stage === 'new')!
  await page.goto(`/deals/${deal.id}`)
  await page.getByRole('button', { name: /단계/ }).click()
  await page.getByRole('option', { name: '적격' }).click()
  await expect(timeline(page).first()).toContainText('신규 → 적격')
  await logActivity(page, '메모', '적격으로 바꾼 이유')
  await expect(timeline(page).nth(0)).toContainText('적격으로 바꾼 이유')
  await expect(timeline(page).nth(1)).toContainText('신규 → 적격')
})

test('a time in the future is refused, pointing to a follow-up instead', async ({ page }) => {
  const contact = (await apiGet<{ id: number }[]>('/api/contacts'))[0]
  const before = (await apiGet<TimelinePage>(`/api/contacts/${contact.id}/timeline`)).total
  await page.goto(`/contacts/${contact.id}`)
  const form = page.getByRole('form', { name: '활동 기록' })
  await form.getByRole('textbox', { name: '내용 (필수)' }).fill('다음 달 방문 예정')
  await form.getByRole('group', { name: /^언제/ }).getByRole('spinbutton', { name: /^년/ }).click()
  await page.keyboard.press('ArrowUp')
  await form.getByRole('button', { name: '기록' }).click()
  await expect(form).toContainText('앞으로의 시간은 고를 수 없어요. 할 일은 후속 조치로 남겨 주세요')
  expect((await apiGet<TimelinePage>(`/api/contacts/${contact.id}/timeline`)).total).toBe(before)
})

test('edits an activity, marks its follow-up done, and deletes it', async ({ page }) => {
  const deal = (await apiGet<Deal[]>('/api/deals')).find((d) => d.stage === 'qualified')!
  const overdue = addDays(await today(), -3)
  const created = await apiSend<Entry>('POST', '/api/activities', {
    kind: 'note',
    deal_id: deal.id,
    description: '샘플 발송 여부 확인',
    occurred_at: daysAgo(5),
    follow_up_date: overdue,
  })
  await page.goto(`/deals/${deal.id}`)
  const note = timeline(page).filter({ hasText: '샘플 발송 여부 확인' })
  await expect(note).toContainText('3일 지남')

  await openEntryMenu(page, note, '수정')
  const form = page.getByRole('dialog', { name: '활동 수정' })
  await expect(form.getByRole('radio', { name: '메모' })).toBeChecked()
  await form.getByRole('radio', { name: '통화' }).click()
  await form.getByRole('textbox', { name: '내용 (필수)' }).fill('샘플 발송 일정 통화')
  await form.getByRole('button', { name: '저장' }).click()
  await expect(form).toBeHidden()
  await expect(toastText(page, '저장했어요')).toBeVisible()
  const call = timeline(page).filter({ hasText: '샘플 발송 일정 통화' })
  await expect(call).toContainText('통화')

  await call.getByText(`후속 조치 ${formatDateWithWeekday(overdue)}`).click()
  await expect(toastText(page, '후속 조치를 완료했어요')).toBeVisible()
  await expect(call).toContainText('완료')
  await expect(call).not.toContainText('지남')
  await page.reload()
  await expect(call.getByRole('checkbox')).toBeChecked()
  const saved = (await apiGet<TimelinePage>(`/api/deals/${deal.id}/timeline`)).items.find((entry) => entry.id === created.id)!
  expect([saved.kind, saved.description, saved.follow_up_done]).toEqual(['call', '샘플 발송 일정 통화', true])

  await openEntryMenu(page, call, '삭제')
  const confirm = page.getByRole('alertdialog', { name: '삭제' })
  await expect(confirm).toContainText('통화 기록을 삭제할까요?')
  await confirm.getByRole('button', { name: '삭제' }).click()
  await expect(toastText(page, '삭제했어요')).toBeVisible()
  await expect(call).toHaveCount(0)
  const after = await apiGet<TimelinePage>(`/api/deals/${deal.id}/timeline`)
  expect(after.items.some((entry) => entry.id === created.id)).toBe(false)
})

test('every record name shown anywhere is a link (UI-7)', async ({ page }) => {
  const [organizations, contacts, deals] = await Promise.all([
    apiGet<{ name: string }[]>('/api/organizations'),
    apiGet<{ name: string }[]>('/api/contacts'),
    apiGet<Deal[]>('/api/deals'),
  ])
  const names = [...organizations, ...contacts, ...deals].map((record) => record.name)
  const linked = deals.find((deal) => deal.contact_id !== null && deal.organization_id !== null)!
  const paths = [
    '/',
    '/organizations',
    '/contacts',
    '/deals',
    '/pipeline',
    `/organizations/${linked.organization_id}`,
    `/contacts/${linked.contact_id}`,
    `/deals/${linked.id}`,
  ]
  for (const path of paths) {
    await page.goto(path)
    await expect(page.getByRole('main').getByRole('link').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    const plain = await page.evaluate((known) => {
      const found: string[] = []
      const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const text = walker.currentNode.textContent!.replace(/^[\s,]+|[\s,]+$/g, '')
        // The page's own title is the record it's on.
        if (known.includes(text) && !walker.currentNode.parentElement!.closest('a, h1')) found.push(text)
      }
      return found
    }, names)
    expect(plain, `names that aren't links on ${path}`).toEqual([])
  }
})

test.describe('when something can not be loaded', () => {
  // Chrome logs the failed calls.
  test.use({ allowConsole: [/status of (422|500)/] })

  test('a timeline says so instead of saying it is empty', async ({ page }) => {
    const contact = (await apiGet<{ id: number }[]>('/api/contacts'))[0]
    await page.route('**/timeline*', (route) => route.fulfill({ status: 500, body: '{}' }))
    await page.goto(`/contacts/${contact.id}`)
    const main = page.getByRole('main')
    await expect(main.getByText('불러오지 못했어요')).toBeVisible()
    await expect(main.getByText('아직 기록된 활동이 없어요')).toHaveCount(0)

    await page.unroute('**/timeline*')
    await main.getByRole('button', { name: '다시 시도' }).click()
    await expect(timeline(page).first()).toBeVisible()
  })

  test('a record page says so, and a wrong address says it is not there', async ({ page }) => {
    const deal = (await apiGet<Deal[]>('/api/deals'))[0]
    await page.route(`**/api/deals/${deal.id}`, (route) => route.fulfill({ status: 500, body: '{}' }))
    await page.goto(`/deals/${deal.id}`)
    await expect(page.getByText('불러오지 못했어요')).toBeVisible()
    await page.unroute(`**/api/deals/${deal.id}`)
    await page.getByRole('button', { name: '다시 시도' }).click()
    await expect(page.getByRole('heading', { level: 1, name: deal.name })).toBeVisible()

    await page.goto('/deals/abc')
    await expect(page.getByRole('heading', { level: 1, name: '찾을 수 없어요' })).toBeVisible()
  })
})

test('stage and status changes have no edit or delete; notes, calls and emails do', async ({ page }) => {
  // A customer's timeline has a status change, their deals' stage changes and logged activities.
  const contacts = await apiGet<{ id: number; status: string }[]>('/api/contacts')
  let chosen: { id: number; entries: Entry[] } | undefined
  for (const contact of contacts.filter((c) => c.status === 'customer')) {
    const page1 = await apiGet<TimelinePage>(`/api/contacts/${contact.id}/timeline`)
    const kinds = new Set(page1.items.map((entry) => entry.kind))
    if (kinds.has('status_change') && kinds.has('stage_change') && page1.items.some((entry) => !entry.automatic)) {
      chosen = { id: contact.id, entries: page1.items }
      break
    }
  }
  expect(chosen, 'a customer with automatic and logged entries').toBeDefined()

  await page.goto(`/contacts/${chosen!.id}`)
  await expect(timeline(page)).toHaveCount(chosen!.entries.length)
  for (const [index, entry] of chosen!.entries.entries()) {
    await expect(timeline(page).nth(index).getByRole('button', { name: /메뉴$/ })).toHaveCount(entry.automatic ? 0 : 1)
  }
})

test('shows the 50 newest entries, then the rest with 더 보기', async ({ page }) => {
  const deal = (await apiGet<Deal[]>('/api/deals')).find((d) => d.stage === 'new')!
  const before = (await apiGet<TimelinePage>(`/api/deals/${deal.id}/timeline`)).total
  const total = Math.max(before, 0) + 56
  for (let index = 0; index < 56; index++) {
    await apiSend('POST', '/api/activities', {
      kind: 'note',
      deal_id: deal.id,
      description: `통화 메모 ${index + 1}`,
      occurred_at: daysAgo(60 - index),
    })
  }

  await page.goto(`/deals/${deal.id}`)
  await expect(timeline(page)).toHaveCount(50)
  await expect(timeline(page).first()).toContainText('통화 메모 56')
  const more = page.getByRole('button', { name: `더 보기 (${total - 50}건)` })
  await more.click()
  await expect(timeline(page)).toHaveCount(total)
  await expect(more).toBeHidden()
})

const deletions = [
  { kind: '거래처', page: 'an organization', list: '/organizations', record: (id: number) => `/organizations/${id}`, ids: '/api/organizations' },
  { kind: '연락처', page: 'a contact', list: '/contacts', record: (id: number) => `/contacts/${id}`, ids: '/api/contacts' },
  { kind: '영업 기회', page: 'a deal', list: '/deals', record: (id: number) => `/deals/${id}`, ids: '/api/deals' },
] as const

for (const target of deletions) {
  test(`deleting from ${target.page} page goes back to the ${target.kind} table`, async ({ page }) => {
    const record = (await apiGet<{ id: number; name: string }[]>(target.ids))[0]
    await page.goto(target.record(record.id))
    await expect(page.getByRole('heading', { level: 1, name: record.name })).toBeVisible()
    await page.getByRole('button', { name: '삭제', exact: true }).click()
    await page.getByRole('alertdialog', { name: '삭제' }).getByRole('button', { name: '삭제' }).click()

    await expect(page).toHaveURL(target.list)
    await expect(page.getByRole('heading', { level: 1, name: target.kind })).toBeVisible()
    await expect(toastText(page, '삭제했어요')).toBeVisible()
    const remaining = await apiGet<{ id: number }[]>(target.ids)
    expect(remaining.some((row) => row.id === record.id)).toBe(false)
  })
}
