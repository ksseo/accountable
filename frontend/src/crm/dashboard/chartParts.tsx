// What the two monthly charts share: the month labels under the axis, and the
// Midnight tooltip with white text (KO-3, LOOK-8).

import type { ReactNode } from 'react'
import { formatChartMonth } from '../../lib/dates'
import styles from './Dashboard.module.css'

type MonthTickProps = { x?: number | string; y?: number | string; payload?: { value: string; index: number } }

/** "12월", or "2026년 1월" for January and the first month, with the year on a second line. */
export function MonthTick({ x, y, payload, tight = false }: MonthTickProps & { tight?: boolean }) {
  if (!payload) return null
  const [first, second] = splitMonth(tickLabel(payload.value, payload.index === 0, tight))
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" dy={16} className={styles.axis}>
        {first}
      </text>
      {second ? (
        <text textAnchor="middle" dy={33} className={styles.axis}>
          {second}
        </text>
      ) : null}
    </g>
  )
}

/** The bar chart's month labels, which stand closer together. */
export function TightMonthTick(props: MonthTickProps) {
  return <MonthTick {...props} tight />
}

/** A month's label. Where labels are tight, a first December gives up its year, which would run into January's (KO-3). */
export function tickLabel(month: string, first: boolean, tight: boolean): string {
  return formatChartMonth(month, first && !(tight && month.endsWith('-12')))
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

/** Both monthly charts are the same height, so their axes line up side by side. */
export const CHART_HEIGHT = 291
const AXIS_HEIGHT = 44
const BELOW_AXIS = 4
export const MONTH_AXIS = { height: AXIS_HEIGHT, marginBottom: BELOW_AXIS }
/** Where the plot ends and the month labels begin. */
export const PLOT_BOTTOM = CHART_HEIGHT - AXIS_HEIGHT - BELOW_AXIS

/** Where the last point's label goes: above it, or under it when the line comes down to it,
 * so the label isn't on the line. Close to the axis there's no room under it, so it goes above, over the line. */
export function lastLabelPlace(y: number, value: number, previous: number): { y: number; overLine: boolean } {
  const falling = value < previous
  if (falling && y + 30 <= PLOT_BOTTOM) return { y: y + 24, overLine: false }
  return { y: y - 14, overLine: falling }
}

export const GRID_STROKE = 'var(--sea-mist)'
/** Faint Sea Mist: the mockup's #E3EAEC on white (LOOK-8). */
export const GRID_OPACITY = 0.55
export const AXIS_TICK = { fontSize: 11.5, fontWeight: 500, fill: 'var(--muted)' }
