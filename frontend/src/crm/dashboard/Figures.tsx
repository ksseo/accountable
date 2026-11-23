import { Link } from 'react-router'
import { count } from '../../lib/korean'
import { formatMoney, formatPercent } from '../../lib/money'
import type { DashboardFigures } from './api'
import styles from './Dashboard.module.css'

/** "지난달보다 18% 증가", "지난달보다 12% 감소", "지난달과 같아요", or last month's
 * amount when it was $0 and there's nothing to compare against. */
export function wonChange(thisMonth: number, lastMonth: number): { text: string; up: boolean } {
  if (lastMonth === 0) return { text: `지난달 ${formatMoney(0)}`, up: false }
  const change = Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
  if (change > 0) return { text: `지난달보다 ${formatPercent(change)} 증가`, up: true }
  if (change < 0) return { text: `지난달보다 ${formatPercent(-change)} 감소`, up: false }
  return { text: '지난달과 같아요', up: false }
}

/** The four figures: open pipeline, expected revenue, won this month and late
 * deals, which opens the deals table showing only late ones (DASH-3 to DASH-6). */
export function Figures({ figures }: { figures: DashboardFigures }) {
  const expectedShare = figures.open_value > 0 ? Math.round((figures.expected_revenue / figures.open_value) * 100) : 0
  const change = wonChange(figures.won_this_month_value, figures.won_last_month_value)
  const late = figures.late_count > 0
  return (
    <div className={styles.figures}>
      <div className={styles.figureMain}>
        <p className={styles.figureLabel}>진행 중 파이프라인</p>
        <p className={styles.figureValue}>{formatMoney(figures.open_value)}</p>
        <p className={styles.figureSub}>영업 기회 {count(figures.open_count, 'deal')}</p>
      </div>
      <div>
        <p className={styles.figureLabel}>예상 매출</p>
        <p className={styles.figureValue}>{formatMoney(figures.expected_revenue)}</p>
        <p className={styles.figureSub}>파이프라인의 {formatPercent(expectedShare)}</p>
      </div>
      <div>
        <p className={styles.figureLabel}>이번 달 수주</p>
        <p className={styles.figureValue}>{formatMoney(figures.won_this_month_value)}</p>
        <p className={styles.figureSub}>
          수주 {count(figures.won_this_month_count, 'deal')} · <span className={change.up ? styles.up : undefined}>{change.text}</span>
        </p>
      </div>
      <Link to="/deals?late=1" className={late ? `${styles.figureLink} ${styles.late}` : styles.figureLink}>
        <p className={styles.figureLabel}>지연된 영업 기회</p>
        <p className={styles.figureValue}>{count(figures.late_count, 'deal')}</p>
        <p className={styles.figureSub}>
          {late ? (
            <>
              모두 <b>{formatMoney(figures.late_value)}</b>
            </>
          ) : (
            '지연된 영업 기회가 없어요'
          )}
        </p>
      </Link>
    </div>
  )
}
