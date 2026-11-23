import { useSyncExternalStore } from 'react'
import styles from './Toasts.module.css'
import { toasts } from './toastStore'

/** The message area, a polite live region that screen readers announce (UI-4, A11Y-5). */
export function Toasts() {
  const items = useSyncExternalStore(toasts.subscribe, toasts.list)
  return (
    <div className={styles.region} role="status" aria-live="polite" aria-atomic="false">
      {items.map((item) => (
        <p key={item.id} className={item.tone === 'error' ? `${styles.toast} ${styles.error}` : styles.toast}>
          {item.message}
        </p>
      ))}
    </div>
  )
}
