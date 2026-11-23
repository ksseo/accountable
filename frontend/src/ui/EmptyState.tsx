import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

/** An empty table or list says so and offers the next step (UI-6). */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p>{message}</p>
      {action}
    </div>
  )
}
