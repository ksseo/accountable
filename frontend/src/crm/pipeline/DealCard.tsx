import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createContext, memo, useCallback, useContext, type KeyboardEvent } from 'react'
import { formatDate } from '../../lib/dates'
import { formatMoney, formatPercent } from '../../lib/money'
import { LateBadge } from '../badges'
import type { StageKey } from '../meta'
import type { Card } from './applyMove'
import styles from './Board.module.css'
import { CardMenu, type CardAction } from './CardMenu'

export const BOARD_HELP_ID = 'board-help'

/** What a card can ask the board to do. The functions never change, so cards
 * only draw again when their own deal or place changes (PERF-3). */
export type BoardActions = {
  open: (dealId: number) => void
  onKey: (event: KeyboardEvent<HTMLElement>, dealId: number) => void
  onMenu: (dealId: number, action: CardAction) => void
  add: (stage: StageKey) => void
  stageLabel: (stage: StageKey) => string
}

export const BoardActionsContext = createContext<BoardActions | null>(null)

function useBoardActions(): BoardActions {
  const actions = useContext(BoardActionsContext)
  if (!actions) throw new Error('DealCard needs BoardActionsContext')
  return actions
}

type BodyProps = {
  deal: Card
  /** Lifted: picked up by keyboard, or the copy that follows the pointer. */
  lifted?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  /** The copy under the pointer has no menu and can't be focused. */
  overlay?: boolean
}

/** A card: name, organization, value, close date and probability, and the
 * "지연 N일" chip on a late deal (PIPE-2). */
export const CardBody = memo(function CardBody({
  deal,
  lifted = false,
  canMoveUp = false,
  canMoveDown = false,
  overlay = false,
}: BodyProps) {
  const actions = useBoardActions()
  const classes = [styles.card, lifted ? styles.lifted : '', overlay ? styles.overlay : ''].filter(Boolean).join(' ')
  return (
    <article
      className={classes}
      tabIndex={overlay ? undefined : 0}
      data-card-id={overlay ? undefined : deal.id}
      aria-label={`${deal.name}, ${formatMoney(deal.value)}`}
      aria-describedby={overlay ? undefined : BOARD_HELP_ID}
      aria-hidden={overlay || undefined}
      onClick={overlay ? undefined : () => actions.open(deal.id)}
      onKeyDown={overlay ? undefined : (event) => actions.onKey(event, deal.id)}
    >
      {deal.is_late ? (
        <p className={styles.lateChip}>
          <LateBadge days={deal.days_late} />
        </p>
      ) : null}
      <h3 className={styles.cardName}>{deal.name}</h3>
      {deal.organization_name ? <p className={styles.cardOrg}>{deal.organization_name}</p> : null}
      {overlay ? null : (
        <div className={styles.cardMenu}>
          <CardMenu
            name={deal.name}
            stage={deal.stage}
            stageLabel={actions.stageLabel}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onAction={(action) => actions.onMenu(deal.id, action)}
          />
        </div>
      )}
      <p className={styles.cardValue}>{formatMoney(deal.value)}</p>
      <p className={deal.is_late ? `${styles.cardFoot} ${styles.lateFoot}` : styles.cardFoot}>
        <span>{deal.close_date ? formatDate(deal.close_date) : '마감일 없음'}</span>
        <span>{formatPercent(deal.probability)}</span>
      </p>
    </article>
  )
})

type CardProps = {
  deal: Card
  index: number
  laneSize: number
  /** Where the card sits in its lane's list, from the lane's virtual list. */
  top: number
  /** Tells the virtual list the card's real height. */
  measure: (node: Element | null) => void
  picked: boolean
}

/** A card in its lane, which the mouse can drag (PIPE-3). */
export const DealCard = memo(function DealCard({ deal, index, laneSize, top, measure, picked }: CardProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: deal.id })
  const ref = useCallback(
    (node: HTMLLIElement | null) => {
      setNodeRef(node)
      if (node) measure(node)
    },
    [setNodeRef, measure],
  )
  return (
    <li
      ref={ref}
      data-index={index}
      className={isDragging ? `${styles.slot} ${styles.placeholder}` : styles.slot}
      style={{ top, transform: CSS.Translate.toString(transform), transition }}
      {...listeners}
    >
      <CardBody deal={deal} lifted={picked} canMoveUp={index > 0} canMoveDown={index < laneSize - 1} />
    </li>
  )
})
