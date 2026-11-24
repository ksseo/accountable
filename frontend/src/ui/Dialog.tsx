import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Dialog as AriaDialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { Button } from './Button'
import styles from './Dialog.module.css'

const UnsavedContext = createContext<(hasUnsaved: boolean) => void>(() => {})

/** Tells the dialog around a form whether closing it would lose something. */
export function useUnsaved(hasUnsaved: boolean): void {
  const tell = useContext(UnsavedContext)
  useEffect(() => {
    tell(hasUnsaved)
    return () => tell(false)
  }, [tell, hasUnsaved])
}

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
 * closes. A click outside doesn't close it, and Escape asks first if something
 * would be lost (FORM-1, A11Y-4). React Aria does the focus work. */
export function Dialog({ title, isOpen, onOpenChange, role = 'dialog', size = 'md', children }: Props) {
  const hasUnsaved = useRef(false)
  const tell = useCallback((value: boolean) => {
    hasUnsaved.current = value
  }, [])
  const [isAsking, setIsAsking] = useState(false)
  // A save that finished meanwhile closed the dialog, so there's nothing to ask.
  if (isAsking && !isOpen) setIsAsking(false)

  const close = () => onOpenChange(false)
  return (
    <>
      <Frame
        title={title}
        isOpen={isOpen}
        onEscape={() => (hasUnsaved.current ? setIsAsking(true) : close())}
        onClose={role === 'dialog' ? close : undefined}
        role={role}
        size={size}
      >
        <UnsavedContext.Provider value={tell}>{children}</UnsavedContext.Provider>
      </Frame>
      <Frame
        title="저장하지 않고 닫을까요?"
        isOpen={isAsking}
        onEscape={() => setIsAsking(false)}
        role="alertdialog"
        size="sm"
      >
        <p>입력한 내용이 사라져요.</p>
        <DialogActions>
          <SafeButton onPress={() => setIsAsking(false)}>계속 입력</SafeButton>
          <Button variant="danger" onPress={close}>
            버리기
          </Button>
        </DialogActions>
      </Frame>
    </>
  )
}

type FrameProps = {
  title: string
  isOpen: boolean
  onEscape: () => void
  /** For the 닫기 button, where there is one. */
  onClose?: () => void
  role: 'dialog' | 'alertdialog'
  size: 'md' | 'sm'
  children: ReactNode
}

function Frame({ title, isOpen, onEscape, onClose, role, size, children }: FrameProps) {
  return (
    <ModalOverlay className={styles.overlay} isOpen={isOpen} onOpenChange={(open) => !open && onEscape()}>
      <Modal className={size === 'sm' ? `${styles.modal} ${styles.sm}` : styles.modal}>
        <AriaDialog className={styles.dialog} role={role}>
          <div className={styles.head}>
            <Heading slot="title" className={styles.title}>
              {title}
            </Heading>
            {onClose ? (
              <Button variant="ghost" size="sm" aria-label="닫기" className={styles.close} onPress={onClose}>
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

/** The answer to a question that loses nothing. Focus starts on it when the
 * question opens (FORM-1, DEL-1). */
export function SafeButton({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null)
  // A child's effects run first, so React Aria's dialog finds focus already
  // inside it and doesn't take it for itself.
  useEffect(() => ref.current?.focus({ preventScroll: true }), [])
  return (
    <Button ref={ref} variant="page" onPress={onPress}>
      {children}
    </Button>
  )
}
