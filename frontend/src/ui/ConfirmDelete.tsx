import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from './Button'
import { Dialog, DialogActions, SafeButton } from './Dialog'
import { Skeleton } from './Skeleton'
import styles from './ConfirmDelete.module.css'

type Props = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** What will happen, with the counts; null while they load. Each feature writes its own (DEL-2). */
  message: ReactNode | null
  onConfirm: () => Promise<unknown>
}

/** Every delete asks first. Focus starts on 취소, and the delete button is
 * Raspberry ink with white text (DEL-1). */
export function ConfirmDelete({ isOpen, onOpenChange, message, onConfirm }: Props) {
  const [pending, setPending] = useState(false)

  async function confirm() {
    setPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog title="삭제" role="alertdialog" size="sm" isOpen={isOpen} onOpenChange={onOpenChange}>
      <div className={styles.message}>
        {message ?? (
          <>
            <Skeleton width="90%" />
            <Skeleton width="60%" />
          </>
        )}
      </div>
      <DialogActions>
        <SafeButton onPress={() => onOpenChange(false)}>취소</SafeButton>
        <Button variant="danger" isDisabled={message === null || pending} onPress={confirm}>
          삭제
        </Button>
      </DialogActions>
    </Dialog>
  )
}
