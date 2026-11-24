import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock } from 'lucide-react'
import {
  createContext,
  memo,
  useCallback,
  useContext,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { formatDate } from '../../lib/dates'
import { formatMoney, formatPercent } from '../../lib/money'
import { RecordLink } from '../../ui/RecordLink'
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

type FaceProps = {
  deal: Card
  /** Whether the names link to their own pages. */
  linked: boolean
  menu: ReactNode
}

/** What a card shows: name, organization, value, close date and probability,
 * and the "지연 N일" chip on a late deal (PIPE-2). */
function CardFace({ deal, linked, menu }: FaceProps) {
  return (
    <>
      {deal.is_late ? (
        <p className={styles.lateChip}>
          <Clock size={18} aria-hidden="true" />
          지연 {deal.days_late}일
        </p>
      ) : null}
      <h3 className={styles.cardName}>
        {linked ? (
          <RecordLink kind="deal" id={deal.id} tabIndex={-1}>
            {deal.name}
          </RecordLink>
        ) : (
          deal.name
        )}
      </h3>
      {deal.organization_id !== null ? (
        <p className={styles.cardOrg}>
          {linked ? (
            <RecordLink kind="organization" id={deal.organization_id} quiet>
              {deal.organization_name}
            </RecordLink>
          ) : (
            deal.organization_name
          )}
        </p>
      ) : null}
      {menu}
      <p className={styles.cardValue}>{formatMoney(deal.value)}</p>
      <p className={deal.is_late ? `${styles.cardFoot} ${styles.lateFoot}` : styles.cardFoot}>
        <span>{deal.close_date ? formatDate(deal.close_date) : '마감일 없음'}</span>
        <span className={styles.cardProbability}>{formatPercent(deal.probability)}</span>
      </p>
    </>
  )
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

/** A card, which opens its deal and takes the board's keys (PIPE-5, PIPE-9), or
 * the copy of one that follows the pointer. */
export const CardBody = memo(function CardBody({
  deal,
  lifted = false,
  canMoveUp = false,
  canMoveDown = false,
  overlay = false,
}: BodyProps) {
  const actions = useBoardActions()
  const classes = [styles.card, lifted ? styles.lifted : '', overlay ? styles.overlay : '']
    .filter(Boolean)
    .join(' ')

  const onName = (event: MouseEvent<HTMLElement>) => (event.target as HTMLElement).closest('a') !== null

  function openCard(event: MouseEvent<HTMLElement>) {
    // The names on the card go to their own pages.
    if (!onName(event)) actions.open(deal.id)
  }

  // A press on a name focuses the card, as one anywhere else on it does, so
  // after a drag Space still picks it up.
  function focusCard(event: MouseEvent<HTMLElement>) {
    if (event.button !== 0 || !onName(event)) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
  }

  return (
    <article
      className={classes}
      tabIndex={overlay ? undefined : 0}
      data-card-id={overlay ? undefined : deal.id}
      aria-label={`${deal.name}, ${formatMoney(deal.value)}`}
      aria-describedby={overlay ? undefined : BOARD_HELP_ID}
      aria-hidden={overlay || undefined}
      onMouseDown={overlay ? undefined : focusCard}
      onClick={overlay ? undefined : openCard}
      onKeyDown={overlay ? undefined : (event) => actions.onKey(event, deal.id)}
    >
      <CardFace
        deal={deal}
        linked={!overlay}
        menu={
          overlay ? null : (
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
          )
        }
      />
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
