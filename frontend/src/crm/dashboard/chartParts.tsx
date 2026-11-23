// What the two monthly charts share: the month labels under the axis, and the
// Midnight tooltip with white text (KO-3, LOOK-8).

import type { ReactNode } from 'react'
import { formatChartMonth } from '../../lib/dates'
import styles from './Dashboard.module.css'

/** "12월", or "2026년 1월" for January and the first month, with the year on a second line. */
export function MonthTick({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value: string; index: number } }) {
  if (!payload) return null
  const [first, second] = splitMonth(formatChartMonth(payload.value, payload.index === 0))
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" dy={14} className={styles.axis}>
        {first}
      </text>
      {second ? (
        <text textAnchor="middle" dy={31} className={styles.axis}>
          {second}
        </text>
      ) : null}
    </g>
  )
}

/** "2026년 1월" as ["1월", "2026년"], "12월" as ["12월"]. */
export function splitMonth(label: string): [string, string?] {
  const [year, month] = label.split(' ')
  return month ? [month, year] : [label]
}

/** A month written in full, for summaries, tables and tooltips: "2026년 8월". */
export const fullMonth = (month: string) => formatChartMonth(month, true)

export function ChartTooltip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{title}</p>
      {children}
    </div>
  )
}

export const GRID_STROKE = 'var(--sea-mist)'
export const AXIS_TICK = { fontSize: 11.5, fontWeight: 500, fill: 'var(--muted)' }
