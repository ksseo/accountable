import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from 'recharts'
import { count } from '../../lib/korean'
import { ChartPanel } from '../../ui/ChartPanel'
import type { MonthFigures } from './api'
import { CHART_HEIGHT, ChartTooltip, fullMonth, GRID_STROKE, MONTH_AXIS, TightMonthTick } from './chartParts'
import styles from './Dashboard.module.css'

const WON = 'var(--sea-green)'
const LOST = 'var(--coral)'

/** Deals won and lost per month, side by side, each bar with its count (DASH-8). */
export function WonLostChart({ months, className }: { months: readonly MonthFigures[]; className?: string }) {
  const data = months.map((month) => ({ month: month.month, won: month.won_count, lost: month.lost_count }))
  const won = months.reduce((sum, month) => sum + month.won_count, 0)
  const lost = months.reduce((sum, month) => sum + month.lost_count, 0)
  const best = months.reduce((top, month) => (month.won_count > top.won_count ? month : top), months[0])
  const summary =
    won + lost === 0
      ? '최근 12개월 동안 수주하거나 실주한 영업 기회가 없어요.'
      : `최근 12개월 수주 ${count(won, 'deal')}, 실주 ${count(lost, 'deal')}이에요.${
          best.won_count > 0
            ? ` 수주가 가장 많은 달은 ${fullMonth(best.month)} ${count(best.won_count, 'deal')}이에요.`
            : ''
        }`
  const hideZero = (value: unknown) => (Number(value) > 0 ? String(value) : '')

  return (
    <ChartPanel
      title="월별 수주·실주 건수"
      aside={
        <span className={styles.legend} aria-hidden="true">
          <span>
            <i style={{ background: WON }} />
            수주
          </span>
          <span>
            <i style={{ background: LOST }} />
            실주
          </span>
        </span>
      }
      summary={summary}
      className={className}
      table={{
        columns: ['월', '수주', '실주'],
        rows: months.map((month) => [
          fullMonth(month.month),
          count(month.won_count, 'deal'),
          count(month.lost_count, 'deal'),
        ]),
      }}
    >
      <BarChart
        responsive
        style={{ width: '100%', height: CHART_HEIGHT }}
        data={data}
        margin={{ top: 22, right: 8, bottom: MONTH_AXIS.marginBottom, left: 8 }}
        barGap={3}
        barCategoryGap="14%"
        title="월별 수주·실주 건수"
      >
        {/* Every bar has its count on it, so the grid is only the top and the base. */}
        <CartesianGrid
          vertical={false}
          stroke={GRID_STROKE}
          horizontalCoordinatesGenerator={({ offset }) => [offset.top, offset.top + offset.height]}
        />
        <XAxis
          dataKey="month"
          tick={TightMonthTick}
          interval={0}
          axisLine={false}
          tickLine={false}
          height={MONTH_AXIS.height}
        />
        {/* One more than the tallest bar, so its count stays under the top line. */}
        <YAxis hide allowDecimals={false} domain={[0, (max: number) => max + 1]} />
        <Tooltip
          cursor={{ fill: 'var(--page)', stroke: 'var(--month-outline)' }}
          isAnimationActive={false}
          content={({ active, payload }) => {
            const point = active ? payload?.[0]?.payload : undefined
            return point ? (
              <ChartTooltip title={fullMonth(point.month)}>
                <p>
                  수주 {count(point.won, 'deal')} · 실주 {count(point.lost, 'deal')}
                </p>
              </ChartTooltip>
            ) : null
          }}
        />
        <Bar dataKey="won" name="수주" fill={WON} radius={3} maxBarSize={14} isAnimationActive={false}>
          <LabelList
            dataKey="won"
            position="top"
            fill="var(--text)"
            className={styles.barLabel}
            formatter={hideZero}
          />
        </Bar>
        <Bar dataKey="lost" name="실주" fill={LOST} radius={3} maxBarSize={14} isAnimationActive={false}>
          <LabelList
            dataKey="lost"
            position="top"
            fill="var(--text)"
            className={styles.barLabel}
            formatter={hideZero}
          />
        </Bar>
      </BarChart>
    </ChartPanel>
  )
}
