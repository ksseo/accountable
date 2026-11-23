import { formatMoney, formatPercent } from '../../lib/money'
import { STAGE_COLORS } from '../badges'
import { isClosed, stageLabel, type Meta } from '../meta'
import type { Board } from './applyMove'
import styles from './Board.module.css'

/** The open pipeline as one band, each stage as wide as its share of the value. */
export function ShareBand({ board, meta }: { board: Board; meta: Meta }) {
  const open = board.columns.filter((column) => !isClosed(column.stage))
  if (board.open_value === 0) return null
  const label = open.map((column) => `${stageLabel(meta, column.stage)} ${formatMoney(column.value)}`).join(', ')
  return (
    <div className={styles.share}>
      <div className={styles.shareBand} role="img" aria-label={`진행 중인 단계별 금액: ${label}`}>
        {open.map((column) =>
          column.value > 0 ? (
            <span key={column.stage} style={{ flexGrow: column.value, background: STAGE_COLORS[column.stage].fill }} />
          ) : null,
        )}
      </div>
      <div className={styles.shareKey} aria-hidden="true">
        {open.map((column) =>
          column.value > 0 ? (
            <span key={column.stage} style={{ flexGrow: column.value }}>
              {stageLabel(meta, column.stage)} {formatPercent(Math.round((column.value / board.open_value) * 100))}
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}
