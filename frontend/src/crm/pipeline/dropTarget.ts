// Where a dragged card lands: the lane under the pointer, and the place in it
// below every card whose middle is above the dragged card's middle. The same
// rule holds when the card enters a lane and while it moves within one, so
// what the board shows during the drag is where the card is dropped (PIPE-3).

import {
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import type { StageKey } from '../meta'

export const laneId = (stage: string) => `lane:${stage}`
export const isLane = (id: UniqueIdentifier) => String(id).startsWith('lane:')

/** A lane and a place in it, counted from 0 with the dragged card taken out. */
export type DropTarget = { stage: StageKey; index: number }

type CardSpot = { index: number; middle: number }

/**
 * The place for a card whose middle is at `middle`, among the cards drawn in
 * a lane. `index` is each card's place in the lane, counting the dragged card
 * if it's there (`draggedIndex`). Lanes only draw the cards in view, so the
 * place comes from the drawn cards' own places.
 */
export function dropIndex(middle: number, cards: readonly CardSpot[], draggedIndex: number | null): number {
  const withoutDragged = (index: number) =>
    draggedIndex !== null && draggedIndex < index ? index - 1 : index
  const others = cards.filter((card) => card.index !== draggedIndex)
  if (others.length === 0) return 0
  const above = others.filter((card) => card.middle < middle)
  if (above.length > 0) return withoutDragged(Math.max(...above.map((card) => card.index))) + 1
  return withoutDragged(Math.min(...others.map((card) => card.index)))
}

/**
 * dnd-kit's collision step for the board. It returns the card the dragged
 * card would take the place of (so the lane shows the gap there), or the
 * lane while the card is still in another one, with the drop target as data.
 */
export const boardCollision: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  const hits = within.length > 0 ? within : rectIntersection(args)
  const lane = hits.find((hit) => isLane(hit.id))
  if (!lane || !args.collisionRect) return []
  const stage = String(lane.id).slice('lane:'.length) as StageKey
  const middle = args.collisionRect.top + args.collisionRect.height / 2

  let items: readonly UniqueIdentifier[] = []
  const cards: CardSpot[] = []
  for (const container of args.droppableContainers) {
    const sortable = container.data.current?.sortable as
      { containerId: UniqueIdentifier; index: number; items: UniqueIdentifier[] } | undefined
    const rect = args.droppableRects.get(container.id)
    if (!sortable || sortable.containerId !== stage || !rect) continue
    items = sortable.items
    cards.push({ index: sortable.index, middle: rect.top + rect.height / 2 })
  }
  const draggedIndex = items.indexOf(args.active.id)
  const index = dropIndex(middle, cards, draggedIndex >= 0 ? draggedIndex : null)
  const target: DropTarget = { stage, index }
  const over = draggedIndex >= 0 ? (items[index] ?? args.active.id) : lane.id
  return [{ id: over, data: { target } }]
}

/** The drop target a collision step worked out, if any. */
export function targetOf(collisions: { data?: Record<string, unknown> }[] | null): DropTarget | null {
  return (collisions?.[0]?.data?.target as DropTarget | undefined) ?? null
}
