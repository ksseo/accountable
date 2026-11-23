import { formatRecent } from '../../lib/dates'
import { EmptyState } from '../../ui/EmptyState'
import { Panel } from '../../ui/Panel'
import { RecordLink } from '../../ui/RecordLink'
import { automaticText, KIND_ICONS } from '../activities/kinds'
import { kindLabel, useMeta } from '../meta'
import type { RecentEntry } from './api'
import styles from './Dashboard.module.css'

/** The 10 newest timeline entries across all records, with the record each is
 * on and when (DASH-13). */
export function RecentActivity({ entries, today }: { entries: readonly RecentEntry[]; today: string }) {
  const { data: meta } = useMeta()
  return (
    <Panel title="최근 활동" className={styles.full}>
      {entries.length === 0 ? (
        <EmptyState message="아직 기록된 활동이 없어요" />
      ) : (
        <ul className={styles.feed} aria-label="최근 활동">
          {entries.map((entry) => {
            const Icon = KIND_ICONS[entry.kind]
            const label = kindLabel(meta, entry.kind)
            return (
              <li key={entry.id}>
                <span className={styles.feedIcon} aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div className={styles.feedBody}>
                  <p className={styles.feedText}>
                    {entry.automatic ? `${label}: ${automaticText(meta, entry)}` : entry.description}
                  </p>
                  <p className={styles.on}>
                    {entry.automatic ? null : <span className="sr-only">{label}, </span>}
                    <RecordLink kind={entry.record.kind} id={entry.record.id}>
                      {entry.record.name}
                    </RecordLink>
                    {entry.record.organization_name ? `, ${entry.record.organization_name}` : null}
                  </p>
                </div>
                <time className={styles.at} dateTime={entry.occurred_at}>
                  {formatRecent(entry.occurred_at, today)}
                </time>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
