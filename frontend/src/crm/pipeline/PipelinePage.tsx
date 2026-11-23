import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from '../../app/toastStore'
import { objectParticle, quoted } from '../../lib/korean'
import { formatMoney } from '../../lib/money'
import { PageHeader } from '../../ui/PageHeader'
import { SkeletonRows } from '../../ui/Skeleton'
import { dealImpact, deleteDeal } from '../deals/api'
import { useDealForm } from '../deals/DealFormHost'
import { dealDeleteMessage } from '../deals/deleteMessage'
import { DeleteRecord } from '../DeleteRecord'
import { useRefreshAll } from '../forms'
import { stageLabel, STAGES, useMeta, usualProbability, type Meta, type StageKey } from '../meta'
import {
  BOARD_HELP,
  dropped,
  MOVE_FAILED,
  movedTo,
  pickedUp,
  putBack,
  type Spot,
} from './announcements'
import { moveDeal, usePipeline } from './api'
import { applyMove, isSamePlace, neighbours, placementOf, type Board, type MoveRules, type Placement } from './applyMove'
import styles from './Board.module.css'
import type { CardAction } from './CardMenu'
import { BOARD_HELP_ID, BoardActionsContext, CardBody, type BoardActions } from './DealCard'
import { boardCollision, targetOf } from './dropTarget'
import { Lane } from './Lane'
import { ShareBand } from './ShareBand'

export function PipelinePage() {
  const { data: board } = usePipeline()
  const { data: meta } = useMeta()
  return board && meta ? (
    <PipelineBoard board={board} meta={meta} />
  ) : (
    <>
      <PageHeader title="파이프라인" />
      <SkeletonRows rows={6} />
    </>
  )
}

type Drag = { dealId: number; mode: 'mouse' | 'keyboard'; start: Board; draft: Board }

/**
 * Focuses an element once it can take focus. While a menu is open the rest of
 * the page is inert, and a card moved to another lane is drawn anew, so the
 * menu can't give focus back to its own button.
 */
function focusSoon(find: () => HTMLElement | null, frames = 10): void {
  const element = find()
  if (element && !element.closest('[inert]')) {
    element.focus()
    if (document.activeElement === element) return
  }
  if (frames > 0) requestAnimationFrame(() => focusSoon(find, frames - 1))
}

// dnd-kit's own announcements are English. Keyboard moves have their own, in
// Korean, and every finished move shows a message (UI-4).
const SILENT = {
  announcements: {
    onDragStart: () => undefined,
    onDragMove: () => undefined,
    onDragOver: () => undefined,
    onDragEnd: () => undefined,
    onDragCancel: () => undefined,
  },
  screenReaderInstructions: { draggable: '' },
}

function PipelineBoard({ board, meta }: { board: Board; meta: Meta }) {
  const navigate = useNavigate()
  const dealForm = useDealForm()
  const refreshAll = useRefreshAll()
  const [drag, setDragState] = useState<Drag | null>(null)
  // The board after a drop, shown until the save and the fresh board are back (PIPE-8).
  const [pending, setPending] = useState<{ board: Board; seq: number } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [deleting, setDeleting] = useState<{ id: number; name: string } | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const seqRef = useRef(0)
  const focusRef = useRef<number | null>(null)
  const clickBlockedUntil = useRef(0)

  const shown = drag?.draft ?? pending?.board ?? board

  const rules: MoveRules = useMemo(
    () => ({ today: meta.today, usualProbability: (stage) => usualProbability(meta, stage) ?? 0 }),
    [meta],
  )

  function setDrag(next: Drag | null) {
    dragRef.current = next
    setDragState(next)
  }

  const label = (stage: StageKey) => stageLabel(meta, stage)

  function spotOf(at: Board, dealId: number): Spot {
    const place = placementOf(at, dealId)!
    const column = at.columns.find((item) => item.stage === place.stage)!
    return { stageLabel: label(place.stage), position: place.index + 1, total: column.deals.length }
  }

  function cardOf(at: Board, dealId: number) {
    for (const column of at.columns) {
      const card = column.deals.find((deal) => deal.id === dealId)
      if (card) return card
    }
    return null
  }

  /** Shows the move at once, saves it, and puts the card back if the save fails (PIPE-8). */
  async function commit(start: Board, placement: Placement) {
    const card = cardOf(start, placement.dealId)
    if (!card || isSamePlace(start, placement)) return
    const next = applyMove(start, placement, rules)
    const seq = ++seqRef.current
    setPending({ board: next, seq })
    try {
      const saved = await moveDeal(placement.dealId, { stage: placement.stage, ...neighbours(next, placement.dealId) })
      toast(
        card.stage === placement.stage
          ? `${quoted(card.name, objectParticle)} ${placement.index < placementOf(start, card.id)!.index ? '위로' : '아래로'} 옮겼어요`
          : `${quoted(card.name, objectParticle)} ${label(placement.stage)} 단계로 옮겼어요`,
      )
      if (saved.promoted_contact) toast(`${saved.promoted_contact.name} 님이 고객이 되었어요`)
    } catch {
      if (seq === seqRef.current) setPending(null)
      toast(MOVE_FAILED, 'error')
    }
    await refreshAll()
    if (seq === seqRef.current) setPending(null)
  }

  // A card picked up by keyboard moves to another lane, and React draws it
  // anew there, so focus is put back on it after each move.
  useLayoutEffect(() => {
    const dealId = focusRef.current
    if (dealId === null) return
    const element = document.querySelector<HTMLElement>(`[data-card-id="${dealId}"]`)
    if (element && document.activeElement !== element) element.focus()
    if (!dragRef.current) focusRef.current = null
  })

  function onKey(event: KeyboardEvent<HTMLElement>, dealId: number) {
    // Keys on the card's menu button belong to the menu.
    if (event.target !== event.currentTarget) return
    const current = dragRef.current
    if (current && current.mode === 'keyboard' && current.dealId === dealId) {
      moveByKey(event, current)
      return
    }
    if (current) return
    if (event.key === ' ') {
      event.preventDefault()
      const card = cardOf(shown, dealId)!
      setDrag({ dealId, mode: 'keyboard', start: shown, draft: shown })
      focusRef.current = dealId
      setAnnouncement(pickedUp(card.name, spotOf(shown, dealId)))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      navigate(`/deals/${dealId}`)
    }
  }

  /** Space drops, Escape puts back, the arrows move between lanes and up and down (PIPE-9). */
  function moveByKey(event: KeyboardEvent<HTMLElement>, current: Drag) {
    const { dealId, start, draft } = current
    const name = cardOf(start, dealId)!.name
    const at = placementOf(draft, dealId)!
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      setDrag(null)
      focusRef.current = dealId
      setAnnouncement(isSamePlace(start, at) ? putBack(name, spotOf(start, dealId)) : dropped(name, spotOf(draft, dealId)))
      void commit(start, at)
      return
    }
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      setDrag(null)
      if (event.key === 'Escape') focusRef.current = dealId
      setAnnouncement(putBack(name, spotOf(start, dealId)))
      return
    }
    const lane = draft.columns.find((column) => column.stage === at.stage)!
    const stageIndex = STAGES.indexOf(at.stage)
    let placement: Placement | null = null
    if (event.key === 'ArrowUp' && at.index > 0) placement = { ...at, index: at.index - 1 }
    if (event.key === 'ArrowDown' && at.index < lane.deals.length - 1) placement = { ...at, index: at.index + 1 }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const stage = STAGES[stageIndex + (event.key === 'ArrowLeft' ? -1 : 1)]
      if (stage) {
        const target = draft.columns.find((column) => column.stage === stage)!
        placement = { dealId, stage, index: Math.min(at.index, target.deals.length) }
      }
    }
    if (!event.key.startsWith('Arrow')) return
    event.preventDefault()
    if (!placement) return
    const next = applyMove(start, placement, rules)
    setDrag({ ...current, draft: next })
    focusRef.current = dealId
    setAnnouncement(movedTo(spotOf(next, dealId)))
  }

  function onMenu(dealId: number, action: CardAction) {
    const at = placementOf(shown, dealId)
    const card = cardOf(shown, dealId)
    if (!at || !card) return
    if (action.kind === 'edit') return dealForm.openEdit(card)
    if (action.kind === 'delete') return setDeleting({ id: card.id, name: card.name })
    if (action.kind === 'stage') void commit(shown, { dealId, stage: action.stage, index: 0 })
    else void commit(shown, { ...at, index: at.index + (action.kind === 'up' ? -1 : 1) })
    // Back to the card's menu button, so the next 위로 or 아래로 is one key away.
    focusSoon(() => document.querySelector<HTMLElement>(`[data-card-id="${dealId}"] button`))
  }

  // The functions cards call go through a ref, so the context value never
  // changes and cards don't draw again when the board does.
  const handlers = useRef({ onKey, onMenu, open: (_: number) => {}, add: (_: StageKey) => {}, label })
  useLayoutEffect(() => {
    handlers.current = {
      onKey,
      onMenu,
      label,
      open: (dealId) => {
        if (Date.now() < clickBlockedUntil.current || dragRef.current) return
        navigate(`/deals/${dealId}`)
      },
      add: (stage) => dealForm.openNew({ stage }),
    }
  })
  const actions: BoardActions = useMemo(
    () => ({
      open: (dealId) => handlers.current.open(dealId),
      onKey: (event, dealId) => handlers.current.onKey(event, dealId),
      onMenu: (dealId, action) => handlers.current.onMenu(dealId, action),
      add: (stage) => handlers.current.add(stage),
      stageLabel: (stage) => handlers.current.label(stage),
    }),
    [],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function onDragStart({ active }: DragStartEvent) {
    if (dragRef.current) return
    setDrag({ dealId: Number(active.id), mode: 'mouse', start: shown, draft: shown })
  }

  // A card entering another lane is moved into it here; within its lane, the
  // sortable list shows the gap until the drop.
  function onDragOver({ collisions }: DragOverEvent) {
    const current = dragRef.current
    const target = targetOf(collisions)
    if (!current || current.mode !== 'mouse' || !target) return
    if (target.stage === placementOf(current.draft, current.dealId)!.stage) return
    setDrag({ ...current, draft: applyMove(current.start, { dealId: current.dealId, ...target }, rules) })
  }

  function onDragEnd({ collisions }: DragEndEvent) {
    const current = dragRef.current
    if (!current || current.mode !== 'mouse') return
    clickBlockedUntil.current = Date.now() + 300
    const target = targetOf(collisions)
    setDrag(null)
    // Dropped outside the lanes: the card goes back.
    if (!target) return
    void commit(current.start, { dealId: current.dealId, ...target })
  }

  function onDragCancel() {
    if (dragRef.current?.mode === 'mouse') setDrag(null)
  }

  const overlayCard = drag?.mode === 'mouse' ? cardOf(drag.draft, drag.dealId) : null

  return (
    <BoardActionsContext.Provider value={actions}>
      <PageHeader
        title="파이프라인"
        summary={`진행 중 ${formatMoney(shown.open_value)}, 예상 매출 ${formatMoney(shown.open_expected_revenue)}. 카드를 끌어 단계를 바꾸세요.`}
      />
      <ShareBand board={shown} meta={meta} />
      <p id={BOARD_HELP_ID} hidden>
        {BOARD_HELP}
      </p>
      <p className="sr-only" aria-live="assertive" aria-atomic="true" data-testid="board-announcer">
        {announcement}
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={boardCollision}
        accessibility={SILENT}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className={styles.board} role="region" aria-label="파이프라인 보드">
          {shown.columns.map((column) => (
            <Lane
              key={column.stage}
              column={column}
              openValue={shown.open_value}
              activeId={drag && column.deals.some((deal) => deal.id === drag.dealId) ? drag.dealId : null}
              keyboard={drag?.mode === 'keyboard'}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>{overlayCard ? <CardBody deal={overlayCard} overlay lifted /> : null}</DragOverlay>
      </DndContext>
      <DeleteRecord
        target={deleting}
        onClose={() => setDeleting(null)}
        kind="deals"
        loadImpact={dealImpact}
        message={dealDeleteMessage}
        remove={deleteDeal}
        onDeleted={() => setDeleting(null)}
      />
    </BoardActionsContext.Provider>
  )
}
