import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { Button } from './Button'
import styles from './Dialog.module.css'

type Props = {
  title: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** alertdialog for questions such as "삭제할까요?" */
  role?: 'dialog' | 'alertdialog'
  size?: 'md' | 'sm'
  children: ReactNode
}

/** A dialog over the page. Focus moves in, stays inside and goes back when it
 * closes; Escape closes it (FORM-1, A11Y-4). React Aria does the focus work. */
export function Dialog({ title, isOpen, onOpenChange, role = 'dialog', size = 'md', children }: Props) {
  return (
    <ModalOverlay
      className={styles.overlay}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={role === 'dialog'}
    >
      <Modal className={size === 'sm' ? `${styles.modal} ${styles.sm}` : styles.modal}>
        <AriaDialog className={styles.dialog} role={role}>
          <div className={styles.head}>
            <Heading slot="title" className={styles.title}>
              {title}
            </Heading>
            {role === 'dialog' ? (
              <Button variant="ghost" size="sm" slot="close" aria-label="닫기" className={styles.close}>
                <X size={18} aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          {children}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  )
}

/** The row of buttons at the bottom of a dialog. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}
