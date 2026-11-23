import type { CSSProperties } from 'react'
import styles from './Skeleton.module.css'

/** A panel's shape in a muted color while its data loads, instead of a spinner (UI-5). */
export function Skeleton({ width = '100%', height = 16, style }: { width?: string | number; height?: number; style?: CSSProperties }) {
  return <span className={styles.block} style={{ width, height, ...style }} aria-hidden="true" />
}

/** Rows of shapes, for a table or list that's loading. */
export function SkeletonRows({ rows = 8, label = '불러오는 중' }: { rows?: number; label?: string }) {
  return (
    <div className={styles.rows} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.row}>
          <Skeleton width="28%" />
          <Skeleton width="16%" />
          <Skeleton width="22%" />
          <Skeleton width="12%" />
        </div>
      ))}
    </div>
  )
}
