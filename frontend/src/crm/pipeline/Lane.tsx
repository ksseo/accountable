import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'
import { Plus } from 'lucide-react'
import { memo, useCallback, useContext, useMemo, useRef } from 'react'
import { Button } from 'react-aria-components'
import { formatMoney } from '../../lib/money'
import { STAGE_COLORS } from '../badges'
import { isClosed, type StageKey } from '../meta'
import type { Board, Card } from './applyMove'
import styles from './Board.module.css'
import { BoardActionsContext, DealCard } from './DealCard'
import { laneId } from './dropTarget'

type Props = {
  column: Board['columns'][number]
  /** The open pipeline's value, for the share bar under an open lane's totals. */
  openValue: number
  /** The card being moved, if it's in this lane. It's always drawn, even when scrolled out of view. */
  activeId: number | null
  /** Whether that card was picked up by keyboard, which draws it lifted. */
  keyboard: boolean
}

// A card is about 120 to 150 px tall; each is measured once drawn.
const ESTIMATED_CARD_HEIGHT = 130
const CARD_GAP = 8
// Cards drawn above and below the ones in view. Every drawn card draws again
// when a drag starts, so this stays small (PERF-3).
const OVERSCAN = 3

/** One stage's lane: name, count, total, expected revenue or "최근 30일", the
 * share bar, "추가" and the cards (PIPE-1, PIPE-4). */
export const Lane = memo(function Lane({ column, openValue, activeId, keyboard }: Props) {
  const actions = useContext(BoardActionsContext)!
  const { stage, deals } = column
  const colors = STAGE_COLORS[stage]
  const label = actions.stageLabel(stage)
  // The whole lane takes drops, so an empty one does too.
  const { setNodeRef } = useDroppable({ id: laneId(stage), data: { stage } })
  const headingId = `lane-${stage}`
  const closed = isClosed(stage)
  const share = !closed && openValue > 0 ? (column.value / openValue) * 100 : 0

  return (
    <section
      ref={setNodeRef}
      className={styles.lane}
      style={{ background: colors.tint }}
      aria-labelledby={headingId}
    >
      <div className={styles.laneHead}>
        <div className={styles.laneTitle}>
          <h2 id={headingId} style={{ color: colors.ink }}>
            {label}
          </h2>
          <span className={styles.laneCount}>
            <span className="sr-only">영업 기회 </span>
            {column.count}
            <span className="sr-only">건</span>
          </span>
        </div>
        <p className={styles.laneTotal}>{formatMoney(column.value)}</p>
        <p className={styles.laneExpected}>
          {closed ? (
            '최근 30일'
          ) : (
            <>
              예상 <b>{formatMoney(column.expected_revenue)}</b>
            </>
          )}
        </p>
        {closed ? null : (
          <div className={styles.laneShare} aria-hidden="true">
            <span style={{ width: `${share}%`, background: colors.fill }} />
          </div>
        )}
      </div>
      <Button
        className={styles.laneAdd}
        aria-label={`${label} 단계에 영업 기회 추가`}
        onPress={() => actions.add(stage)}
      >
        <Plus size={15} aria-hidden="true" />
        추가
      </Button>
      <LaneCards stage={stage} deals={deals} headingId={headingId} activeId={activeId} keyboard={keyboard} />
    </section>
  )
})

type CardsProps = {
  stage: StageKey
  deals: readonly Card[]
  headingId: string
  activeId: number | null
  keyboard: boolean
}

/** A lane's cards. A lane can hold 170, so it only draws the ones in view
 * (PERF-3). It's apart from the lane so the lane's drop area drawing again
 * during a drag doesn't draw the list again. */
const LaneCards = memo(function LaneCards({ stage, deals, headingId, activeId, keyboard }: CardsProps) {
  const ids = useMemo(() => deals.map((deal) => deal.id), [deals])
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeIndex = activeId === null ? -1 : ids.indexOf(activeId)
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range)
      if (activeIndex >= 0 && !indexes.includes(activeIndex)) indexes.push(activeIndex)
      return indexes
    },
    [activeIndex],
  )
  const virtualizer = useVirtualizer({
    count: deals.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    gap: CARD_GAP,
    overscan: OVERSCAN,
    getItemKey: (index) => ids[index],
    rangeExtractor,
  })

  return (
    <div ref={scrollRef} className={styles.cards}>
      <SortableContext id={stage} items={ids} strategy={verticalListSortingStrategy}>
        <ol
          className={styles.cardList}
          style={{ height: virtualizer.getTotalSize() }}
          aria-labelledby={headingId}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const deal = deals[item.index]
            return (
              <DealCard
                key={deal.id}
                deal={deal}
                index={item.index}
                laneSize={deals.length}
                top={item.start}
                measure={virtualizer.measureElement}
                picked={keyboard && activeId === deal.id}
              />
            )
          })}
        </ol>
      </SortableContext>
    </div>
  )
})
