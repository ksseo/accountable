import { count } from '../../lib/korean'
import { formatMoney, formatPercent } from '../../lib/money'
import { ChartPanel } from '../../ui/ChartPanel'
import { STAGE_COLORS } from '../badges'
import { stageLabel, useMeta } from '../meta'
import type { FunnelStage } from './api'
import styles from './Dashboard.module.css'
import { funnelWidths } from './widths'

const VIEW_WIDTH = 520
const FUNNEL_WIDTH = 300
const SEGMENT_HEIGHT = 58
const GAP = 5
/** The narrowest a segment is drawn, against New's width, so its name fits. */
export const FUNNEL_MIN_WIDTH = 0.28

const percentOf = (share: number) => formatPercent(Math.round(share * 100))
const round = (value: number) => Math.round(value * 10) / 10

/** New to Won as trapezoids narrowing with the value that reached each stage,
 * with the figures beside them and the conversion rate under them (DASH-10, RULE-13). */
export function Funnel({ funnel, conversion, className }: { funnel: readonly FunnelStage[]; conversion: number; className?: string }) {
  const { data: meta } = useMeta()
  const widths = funnelWidths(
    funnel.map((stage) => stage.value),
    FUNNEL_MIN_WIDTH,
  ).map((width) => width * FUNNEL_WIDTH)
  const height = funnel.length * (SEGMENT_HEIGHT + GAP)
  const middle = FUNNEL_WIDTH / 2

  const label = (stage: FunnelStage) => stageLabel(meta, stage.stage)
  const summary = `최근 12개월 영업 퍼널: ${funnel
    .map((stage) => `${label(stage)} ${formatMoney(stage.value)} (${count(stage.count, 'deal')})`)
    .join(', ')}. 신규에서 수주까지 금액 기준 전환율은 ${percentOf(conversion)}예요.`

  return (
    <ChartPanel
      title="영업 퍼널"
      aside="최근 12개월"
      summary={summary}
      className={className}
      table={{
        columns: ['단계', '금액', '건수', '신규 대비'],
        rows: funnel.map((stage) => [label(stage), formatMoney(stage.value), count(stage.count, 'deal'), percentOf(stage.share)]),
      }}
    >
      <svg className={styles.funnel} width={VIEW_WIDTH} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} aria-hidden="true">
        {funnel.map((stage, index) => {
          const colors = STAGE_COLORS[stage.stage]
          const top = widths[index]
          const bottom = index < funnel.length - 1 ? widths[index + 1] : top * 0.86
          const y = index * (SEGMENT_HEIGHT + GAP)
          const points = [
            [middle - top / 2, y],
            [middle + top / 2, y],
            [middle + bottom / 2, y + SEGMENT_HEIGHT],
            [middle - bottom / 2, y + SEGMENT_HEIGHT],
          ]
          return (
            <g key={stage.stage} data-stage={stage.stage} data-width={round(top)}>
              <path d={`M ${points.map((point) => point.map(round).join(' ')).join(' L ')} Z`} fill={colors.badge} />
              <text x={middle} y={y + SEGMENT_HEIGHT / 2 + 5} textAnchor="middle" className={styles.funnelName} fill={colors.on}>
                {label(stage)}
              </text>
              <text x={FUNNEL_WIDTH + 28} y={y + 25} className={styles.funnelValue}>
                {formatMoney(stage.value)}
              </text>
              <text x={FUNNEL_WIDTH + 28} y={y + 43} className={styles.funnelSub}>
                {count(stage.count, 'deal')}, 신규의 {percentOf(stage.share)}
              </text>
            </g>
          )
        })}
      </svg>
      <p className={styles.funnelFoot}>
        신규 → 수주 전환율 (금액 기준)<b>{percentOf(conversion)}</b>
      </p>
    </ChartPanel>
  )
}
