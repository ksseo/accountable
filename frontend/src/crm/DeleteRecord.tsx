import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from '../app/toastStore'
import { ConfirmDelete } from '../ui/ConfirmDelete'

type Props<Impact> = {
  /** The record to delete; null when the dialog is closed. */
  target: { id: number; name: string } | null
  onClose: () => void
  /** The query key of the record's kind, such as 'organizations'. */
  kind: string
  loadImpact: (id: number) => Promise<Impact>
  /** The feature's own message, with the counts (DEL-2). */
  message: (name: string, impact: Impact) => string
  remove: (id: number) => Promise<unknown>
  onDeleted?: () => void
}

/** Asks first, with what will happen to linked records, then deletes (DEL-1, DEL-2). */
export function DeleteRecord<Impact>({ target, onClose, kind, loadImpact, message, remove, onDeleted }: Props<Impact>) {
  const queryClient = useQueryClient()
  // The counts are read once when the dialog opens. As a query they'd be
  // fetched again with everything else after the delete, and get a 404.
  const [impact, setImpact] = useState<{ id: number; value: Impact } | null>(null)
  const targetId = target?.id
  // Pages pass a new onClose on every render; the effect below shouldn't rerun for that.
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (targetId === undefined) return
    let current = true
    loadImpact(targetId).then(
      (value) => current && setImpact({ id: targetId, value }),
      () => {
        if (!current) return
        toast('삭제할 내용을 불러오지 못했어요. 다시 시도해 주세요.', 'error')
        closeRef.current()
      },
    )
    return () => {
      current = false
    }
  }, [targetId, loadImpact])

  async function confirm() {
    if (!target) return
    try {
      await remove(target.id)
    } catch {
      toast('삭제하지 못했어요. 다시 시도해 주세요.', 'error')
      return
    }
    onDeleted?.()
    queryClient.removeQueries({ queryKey: [kind, target.id], exact: true })
    await queryClient.invalidateQueries()
    toast('삭제했어요')
  }

  return (
    <ConfirmDelete
      isOpen={target !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      message={target && impact?.id === target.id ? message(target.name, impact.value) : null}
      onConfirm={confirm}
    />
  )
}
