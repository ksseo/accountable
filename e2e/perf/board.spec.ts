// The board with about 1,000 deals (SC 9, PERF-3, PERF-4, TEST-5): a card
// follows the pointer smoothly, the totals are right within 200 ms of the
// drop, and the dashboard and pipeline calls answer within 300 ms.
import { formatMoney } from '../../frontend/src/lib/money'
import { expect, resetData, test } from '../support/fixtures'
import { API_URL, loadBulkData } from '../support/servers'

type Pipeline = { columns: { stage: string; count: number; value: number; deals: { id: number; value: number }[] }[] }

test.describe.configure({ mode: 'serial' })
test.beforeAll(() => loadBulkData())
test.afterAll(() => resetData())

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

test('dragging a card across full lanes keeps every frame under 100 ms', async ({ page }) => {
  const board = (await (await fetch(`${API_URL}/api/pipeline`)).json()) as Pipeline
  const lane = (stage: string) => board.columns.find((column) => column.stage === stage)!
  const fullest = Math.max(...board.columns.map((column) => column.count))
  expect(fullest).toBeGreaterThanOrEqual(150)
  const moved = lane('new').deals[0]
  const expectedTotal = formatMoney(lane('proposal').value + moved.value)

  await page.goto('/pipeline')
  const source = page.locator(`[data-card-id="${moved.id}"]`)
  const target = page.locator('section[aria-labelledby="lane-proposal"] [data-card-id]').nth(1)
  await expect(source).toBeVisible()
  const from = (await source.boundingBox())!
  const to = (await target.boundingBox())!

  // Record how long each frame takes while the card is dragged.
  await page.evaluate(() => {
    const frames: number[] = []
    let last = performance.now()
    let running = true
    const tick = (now: number) => {
      frames.push(now - last)
      last = now
      if (running) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    Object.assign(window, { __frames: frames, __stopFrames: () => (running = false) })
  })

  const started = Date.now()
  await page.mouse.move(from.x + from.width / 2, from.y + 20)
  await page.mouse.down()
  const steps = 60
  for (let step = 1; step <= steps; step += 1) {
    const x = from.x + from.width / 2 + ((to.x - from.x) * step) / steps
    const y = from.y + 20 + ((to.y + 10 - from.y - 20) * step) / steps
    await page.mouse.move(x, y)
  }
  const dragMs = Date.now() - started
  const frames = await page.evaluate(() => {
    const state = window as unknown as { __frames: number[]; __stopFrames: () => void }
    state.__stopFrames()
    return state.__frames.slice(1)
  })

  // The time from the drop until the proposal lane shows its new total.
  await page.evaluate((expected) => {
    const total = document.querySelector('section[aria-labelledby="lane-proposal"] p')!
    const state = window as unknown as { __dropAt: number; __rightAt: number }
    state.__dropAt = performance.now()
    const check = () => {
      if (total.textContent === expected) state.__rightAt = performance.now()
      else requestAnimationFrame(check)
    }
    check()
  }, expectedTotal)
  await page.mouse.up()
  await expect(page.locator('section[aria-labelledby="lane-proposal"] p').first()).toHaveText(expectedTotal)
  const totalsMs = await page.evaluate(() => {
    const state = window as unknown as { __dropAt: number; __rightAt: number }
    return state.__rightAt - state.__dropAt
  })

  const slowest = Math.max(...frames)
  const typical = median(frames)
  console.log(
    `board: ${fullest} cards in the fullest lane; a ${dragMs} ms drag drew ${frames.length} frames, median ${typical.toFixed(1)} ms, slowest ${slowest.toFixed(1)} ms; totals right ${totalsMs.toFixed(0)} ms after the drop`,
  )
  expect(slowest).toBeLessThan(100)
  expect(typical).toBeLessThan(20)
  expect(totalsMs).toBeLessThan(200)
})

test('the dashboard and pipeline calls answer within 300 ms', async () => {
  for (const path of ['/api/dashboard', '/api/pipeline']) {
    const times: number[] = []
    for (let round = 0; round < 5; round += 1) {
      const started = performance.now()
      const response = await fetch(`${API_URL}${path}`)
      await response.arrayBuffer()
      times.push(performance.now() - started)
    }
    console.log(`${path}: slowest of 5 calls ${Math.max(...times).toFixed(0)} ms`)
    expect(Math.max(...times)).toBeLessThan(300)
  }
})
