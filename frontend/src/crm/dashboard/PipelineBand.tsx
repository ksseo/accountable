import { Link } from 'react-router'
import { count } from '../../lib/korean'
import { formatMoney } from '../../lib/money'
import { STAGE_COLORS } from '../badges'
import { stageLabel, useMeta } from '../meta'
import type { BandStage } from './api'
import styles from './Dashboard.module.css'
import { shareWidths } from './widths'

/** The smallest share of the band a stage takes, so "협상 3건" and its amount fit. */
export const BAND_MIN_SHARE = 0.14

/** The open pipeline as one band: each stage as wide as its value, with the
 * share that's expected revenue under it. Each block opens the board (DASH-9). */
export function PipelineBand({ band }: { band: readonly BandStage[] }) {
  const { data: meta } = useMeta()
  const widths = shareWidths(
    band.map((stage) => stage.value),
    BAND_MIN_SHARE,
  )
  return (
    <>
      <ul className={styles.band} aria-label="단계별 파이프라인">
        {band.map((stage, index) => {
          const colors = STAGE_COLORS[stage.stage]
          const label = stageLabel(meta, stage.stage)
          const expectedShare = stage.value > 0 ? (stage.expected_revenue / stage.value) * 100 : 0
          return (
            <li key={stage.stage} className={styles.bandItem} style={{ flexGrow: widths[index] }} data-stage={stage.stage}>
              {/* The name comes from the text shown, so speech input can say what's
                  on the block (WCAG 2.5.3); the expected revenue under it is added for screen readers. */}
              <Link to="/pipeline" className={styles.bandBlock} style={{ background: colors.badge, color: colors.on }}>
                <span className={styles.bandName}>
                  <span>{label}</span>
                  <span>{count(stage.count, 'deal')}</span>
                </span>
                <span className={styles.bandValue}>{formatMoney(stage.value)}</span>
                <span className="sr-only">예상 {formatMoney(stage.expected_revenue)}</span>
              </Link>
              <div className={styles.bandExpected} aria-hidden="true">
                <span style={{ width: `${expectedShare}%`, background: colors.fill }} />
              </div>
              <p className={styles.bandExpectedLabel} aria-hidden="true">
                예상 <b>{formatMoney(stage.expected_revenue)}</b>
              </p>
            </li>
          )
        })}
      </ul>
      <p className={styles.bandKey}>칸의 너비는 단계별 금액, 아래 막대는 그중 예상 매출의 비율이에요.</p>
    </>
  )
}
