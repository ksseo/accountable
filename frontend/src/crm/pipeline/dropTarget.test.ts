import { describe, expect, it } from 'vitest'
import { dropIndex } from './dropTarget'

// Four cards 100 px tall with 10 px between them: middles at 50, 160, 270, 380.
const lane = [0, 1, 2, 3].map((index) => ({ index, middle: 50 + index * 110 }))

describe('dropIndex', () => {
  it('goes below every card whose middle is above the dragged card’s middle', () => {
    expect(dropIndex(20, lane, null)).toBe(0)
    expect(dropIndex(100, lane, null)).toBe(1)
    expect(dropIndex(300, lane, null)).toBe(3)
    expect(dropIndex(500, lane, null)).toBe(4)
  })

  it('goes into an empty lane at the top', () => {
    expect(dropIndex(300, [], null)).toBe(0)
  })

  it('counts places without the dragged card when it is in the lane', () => {
    // The first card dragged to between the third and the fourth.
    expect(dropIndex(300, lane, 0)).toBe(2)
    // The last card dragged to the top.
    expect(dropIndex(20, lane, 3)).toBe(0)
    // Left where it was.
    expect(dropIndex(160, lane, 1)).toBe(1)
  })

  it('keeps a card below the one it was dropped under, after the lane makes room', () => {
    // One card in the lane, middle at 50; the dragged card entered below it
    // and now sits in the second place, with its middle at 80.
    const after = [
      { index: 0, middle: 50 },
      { index: 1, middle: 165 },
    ]
    expect(dropIndex(80, after, 1)).toBe(1)
  })

  it('works from the cards in view when a long lane only draws some of them', () => {
    const inView = [40, 41, 42].map((index, place) => ({ index, middle: 50 + place * 110 }))
    expect(dropIndex(100, inView, null)).toBe(41)
    expect(dropIndex(10, inView, null)).toBe(40)
    expect(dropIndex(100, inView, 10)).toBe(40)
  })
})
