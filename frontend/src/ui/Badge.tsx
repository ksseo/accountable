import type { ReactNode } from 'react'
import styles from './Badge.module.css'

type Props = {
  /** Fill and text colors, as CSS values. */
  fill: string
  ink: string
  children: ReactNode
  icon?: ReactNode
}

/** A small rounded label. It always carries a word, so color is never the only signal (A11Y-2). */
export function Badge({ fill, ink, icon, children }: Props) {
  return (
    <span className={styles.badge} style={{ background: fill, color: ink }}>
      {icon}
      {children}
    </span>
  )
}
