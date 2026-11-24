import { failedLoad } from '../../api/failedLoad'
import { formatDateWithWeekday } from '../../lib/dates'
import { count, subjectParticle, withParticle } from '../../lib/korean'
import { LoadError } from '../../ui/LoadError'
import { PageHeader } from '../../ui/PageHeader'
import { Panel } from '../../ui/Panel'
import { SkeletonRows } from '../../ui/Skeleton'
import { useDashboard, type Dashboard, type DashboardFigures } from './api'
import styles from './Dashboard.module.css'
import { Figures } from './Figures'
import { FollowUps } from './FollowUps'
import { Funnel } from './Funnel'
import { PipelineBand } from './PipelineBand'
import { RecentActivity } from './RecentActivity'
import { WonLostChart } from './WonLostChart'
import { WonRevenueChart } from './WonRevenueChart'

/** "2026. 11. 23. (월). 기한 지난 후속 조치 3건과 지연된 영업 기회 2건이 있어요." (DASH-2) */
export function headline(today: string, figures: DashboardFigures): string {
  const date = formatDateWithWeekday(today)
  const parts = [
    figures.overdue_follow_up_count > 0
      ? `기한 지난 후속 조치 ${count(figures.overdue_follow_up_count, 'followUp')}`
      : null,
    figures.late_count > 0 ? `지연된 영업 기회 ${count(figures.late_count, 'deal')}` : null,
  ].filter((part): part is string => part !== null)
  if (parts.length === 0) return `${date}. 기한 지난 후속 조치와 지연된 영업 기회가 없어요.`
  if (parts.length === 1) return `${date}. ${parts[0]}${subjectParticle(parts[0])} 있어요.`
  return `${date}. ${parts[0]}${withParticle(parts[0])} ${parts[1]}${subjectParticle(parts[1])} 있어요.`
}

/** The dashboard, laid out as in mockup 3 (DASH-1 to DASH-13). */
export function DashboardPage() {
  const dashboard = useDashboard()
  const { data } = dashboard
  const retry = failedLoad(dashboard)
  return (
    <>
      <PageHeader title="대시보드" summary={data ? headline(data.today, data.figures) : ' '} />
      {data ? (
        <DashboardGrid dashboard={data} />
      ) : retry ? (
        <Panel>
          <LoadError onRetry={retry} />
        </Panel>
      ) : (
        <DashboardSkeleton />
      )}
    </>
  )
}

function DashboardGrid({ dashboard }: { dashboard: Dashboard }) {
  return (
    <div className={styles.grid}>
      <section className={`${styles.hero} ${styles.full}`} aria-label="진행 중 파이프라인">
        <Figures figures={dashboard.figures} />
        <PipelineBand band={dashboard.band} />
      </section>
      <WonRevenueChart months={dashboard.months} className={styles.wide} />
      <WonLostChart months={dashboard.months} className={styles.narrow} />
      <Funnel funnel={dashboard.funnel} conversion={dashboard.conversion} className={styles.narrow} />
      <FollowUps
        followUps={dashboard.follow_ups}
        later={dashboard.follow_ups_later}
        figures={dashboard.figures}
        className={styles.wide}
      />
      <RecentActivity entries={dashboard.recent} today={dashboard.today} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className={styles.grid} aria-busy="true">
      <Panel className={styles.full}>
        <SkeletonRows rows={4} />
      </Panel>
      <Panel className={styles.wide}>
        <SkeletonRows rows={5} />
      </Panel>
      <Panel className={styles.narrow}>
        <SkeletonRows rows={5} />
      </Panel>
    </div>
  )
}
