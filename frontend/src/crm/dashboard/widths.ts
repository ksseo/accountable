// How wide each segment of the pipeline band and the funnel is drawn. Both
// follow value, with a minimum so a small stage's label still fits (DASH-9, DASH-10).

/** Each value's share of the whole, as fractions adding up to 1, with none
 * below `min`. The room the small ones take is shared by the rest in proportion. */
export function shareWidths(values: readonly number[], min: number): number[] {
  const count = values.length
  if (count === 0) return []
  if (min * count >= 1) return values.map(() => 1 / count)
  const atMinimum = new Set<number>()
  for (;;) {
    const free = values.map((_, index) => index).filter((index) => !atMinimum.has(index))
    const room = 1 - atMinimum.size * min
    const total = free.reduce((sum, index) => sum + values[index], 0)
    const widths = values.map((value, index) => {
      if (atMinimum.has(index)) return min
      return total > 0 ? (value / total) * room : room / free.length
    })
    const tooSmall = free.filter((index) => widths[index] < min)
    if (tooSmall.length === 0) return widths
    for (const index of tooSmall) atMinimum.add(index)
  }
}

/** Each value's width against the largest, from 0 to 1, with none below `min`. */
export function funnelWidths(values: readonly number[], min: number): number[] {
  const largest = Math.max(0, ...values)
  return values.map((value) => (largest > 0 ? Math.max(min, value / largest) : min))
}
