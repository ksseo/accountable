import { useState } from 'react'
import { toast } from '../../app/toastStore'
import { formatMonthDay } from '../../lib/dates'
import { count } from '../../lib/korean'
import { Checkbox } from '../../ui/Checkbox'
import { EmptyState } from '../../ui/EmptyState'
import { Panel } from '../../ui/Panel'
import { updateActivity } from '../activities/api'
import { useRefreshAll } from '../forms'
import type { DashboardFigures, FollowUp } from './api'
import styles from './Dashboard.module.css'
import { RecordName } from './RecordName'

type Props = {
  followUps: readonly FollowUp[]
  later: number
  figures: DashboardFigures
  className?: string
}

/** Overdue follow-ups, then today's, then the next 14 days', soonest first.
 * Checking one marks it done and it leaves the list (DASH-12). */
export function FollowUps({ followUps, later, figures, className }: Props) {
  const refresh = useRefreshAll()
  // Ones just marked done, hidden until the fresh list arrives.
  const [done, setDone] = useState<ReadonlySet<number>>(new Set())
  const shown = followUps.filter((followUp) => !done.has(followUp.id))

  async function finish(followUp: FollowUp) {
    setDone((current) => new Set(current).add(followUp.id))
    try {
      await updateActivity(followUp.id, { follow_up_done: true })
    } catch {
      setDone((current) => {
        const next = new Set(current)
        next.delete(followUp.id)
        return next
      })
      toast('저장하지 못했어요. 다시 시도해 주세요.', 'error')
      return
    }
    toast('후속 조치를 완료했어요')
    await refresh()
  }

  const counts = [
    figures.overdue_follow_up_count > 0 ? `기한 지남 ${count(figures.overdue_follow_up_count, 'followUp')}` : null,
    figures.due_today_follow_up_count > 0 ? `오늘 ${count(figures.due_today_follow_up_count, 'followUp')}` : null,
  ].filter(Boolean)

  return (
    <Panel title="후속 조치" aside={counts.length ? counts.join(', ') : '기한 지난 것 없음'} className={className}>
      {shown.length === 0 ? (
        <EmptyState message="앞으로 2주 안에 할 후속 조치가 없어요" />
      ) : (
        <ul className={styles.todo} aria-label="후속 조치">
          {shown.map((followUp) => (
            <li key={followUp.id}>
              <div className={styles.todoMain}>
                <Checkbox isSelected={false} onChange={(selected) => selected && finish(followUp)}>
                  <span className={styles.todoWhat}>{followUp.description}</span>
                </Checkbox>
                <span className={styles.on}>
                  <RecordName record={followUp.record} />
                </span>
              </div>
              <span className={`${styles.when} ${styles[followUp.state]}`}>
                {followUp.state === 'overdue'
                  ? `${followUp.days_overdue}일 지남`
                  : followUp.state === 'today'
                    ? '오늘'
                    : formatMonthDay(followUp.follow_up_date)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {later > 0 ? <p className={styles.todoFoot}>그 이후 {count(later, 'followUp')} 더 있어요.</p> : null}
    </Panel>
  )
}
