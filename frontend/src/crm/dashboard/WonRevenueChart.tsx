import { Area, AreaChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from 'recharts'
import { formatAxisMoney, formatMoney } from '../../lib/money'
import { ChartPanel } from '../../ui/ChartPanel'
import type { MonthFigures } from './api'
import {
  AXIS_TICK,
  CHART_HEIGHT,
  ChartTooltip,
  fullMonth,
  GRID_OPACITY,
  GRID_STROKE,
  lastLabelPlace,
  MONTH_AXIS,
  MonthTick,
} from './chartParts'
import styles from './Dashboard.module.css'

const LINE = 'var(--sea-green-ink)'

/** Revenue won per month for the last 12 months, this one last, as a line with
 * a flat light Sea Green area (DASH-7, LOOK-7). */
export function WonRevenueChart({ months, className }: { months: readonly MonthFigures[]; className?: string }) {
  const data = months.map((month) => ({ month: month.month, value: month.won_value }))
  const total = months.reduce((sum, month) => sum + month.won_value, 0)
  const best = months.reduce((top, month) => (month.won_value > top.won_value ? month : top), months[0])
  const current = months[months.length - 1]
  const summary =
    total === 0
      ? '최근 12개월 동안 수주한 금액이 없어요.'
      : `최근 12개월 수주 금액은 모두 ${formatMoney(total)}이에요. 가장 많은 달은 ${fullMonth(best.month)} ${formatMoney(best.won_value)}, 이번 달은 ${formatMoney(current.won_value)}이에요.`

  return (
    <ChartPanel
      title="월별 수주 금액"
      aside={
        <span>
          최근 12개월 <b>{formatMoney(total)}</b>
        </span>
      }
      summary={summary}
      className={className}
      table={{ columns: ['월', '수주 금액'], rows: months.map((month) => [fullMonth(month.month), formatMoney(month.won_value)]) }}
    >
      <AreaChart
        responsive
        style={{ width: '100%', height: CHART_HEIGHT }}
        data={data}
        margin={{ top: 28, right: 20, bottom: MONTH_AXIS.marginBottom, left: 0 }}
        title="월별 수주 금액"
      >
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeOpacity={GRID_OPACITY} />
        <XAxis dataKey="month" tick={MonthTick} interval={0} axisLine={false} tickLine={false} height={MONTH_AXIS.height} />
        <YAxis tickFormatter={formatAxisMoney} tick={AXIS_TICK} axisLine={false} tickLine={false} tickMargin={4} width={52} />
        <Tooltip
          cursor={{ stroke: GRID_STROKE }}
          isAnimationActive={false}
          content={({ active, payload }) => {
            const point = active ? payload?.[0]?.payload : undefined
            return point ? (
              <ChartTooltip title={fullMonth(point.month)}>
                <p>수주 {formatMoney(point.value)}</p>
              </ChartTooltip>
            ) : null
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={LINE}
          strokeWidth={2.5}
          fill="var(--sea-green)"
          fillOpacity={0.16}
          dot={({ cx, cy, index }) =>
            index === data.length - 1 ? (
              <circle key={index} cx={cx} cy={cy} r={6} fill={LINE} stroke="#fff" strokeWidth={2.5} />
            ) : (
              <circle key={index} cx={cx} cy={cy} r={3.5} fill="#fff" stroke={LINE} strokeWidth={2} />
            )
          }
          activeDot={{ r: 6, fill: LINE, stroke: '#fff', strokeWidth: 2.5 }}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="value"
            content={({ x, y, index, value }) => {
              if (index !== data.length - 1) return null
              const place = lastLabelPlace(Number(y), current.won_value, months[months.length - 2]?.won_value ?? 0)
              return (
                <text
                  x={Number(x)}
                  y={place.y}
                  textAnchor="end"
                  className={place.overLine ? `${styles.pointLabel} ${styles.pointLabelOverLine}` : styles.pointLabel}
                >
                  {formatMoney(Number(value))}
                </text>
              )
            }}
          />
        </Area>
      </AreaChart>
    </ChartPanel>
  )
}
