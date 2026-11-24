import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { failedLoad } from '../../api/failedLoad'
import { toast } from '../../app/toastStore'
import { daysBetween, formatDateTime, formatDateWithWeekday } from '../../lib/dates'
import { count, objectParticle } from '../../lib/korean'
import { Button } from '../../ui/Button'
import { Checkbox } from '../../ui/Checkbox'
import { ConfirmDelete } from '../../ui/ConfirmDelete'
import { EmptyState } from '../../ui/EmptyState'
import { LoadError } from '../../ui/LoadError'
import { Panel } from '../../ui/Panel'
import { RecordLink } from '../../ui/RecordLink'
import { RowMenu } from '../../ui/RowMenu'
import { SkeletonRows } from '../../ui/Skeleton'
import { useRefreshAll } from '../forms'
import { kindLabel, useMeta, type Meta } from '../meta'
import { ActivityEditDialog } from './ActivityEditDialog'
import { ActivityForm, type ActivityValues } from './ActivityForm'
import { deleteActivity, logActivity, updateActivity, useTimeline, type Owner, type TimelineEntry } from './api'
import styles from './Activities.module.css'
import { automaticText, KIND_ICONS } from './kinds'

/** Logging a note, call or email on a record (REC-5). */
export function LogActivity({ owner }: { owner: Owner }) {
  const refresh = useRefreshAll()
  async function log(values: ActivityValues) {
    await logActivity({
      kind: values.kind,
      description: values.description,
      occurred_at: values.occurred_at,
      follow_up_date: values.follow_up_date,
      ...(owner.kind === 'contact' ? { contact_id: owner.id } : { deal_id: owner.id }),
    })
    toast('기록했어요')
    await refresh()
  }
  return (
    <Panel title="활동 기록">
      <ActivityForm mode="log" onSave={log} />
    </Panel>
  )
}

/** A record's timeline, newest first, 50 at a time with "더 보기" (REC-4, REC-6, RULE-9). */
export function Timeline({ owner }: { owner: Owner }) {
  const { data: meta } = useMeta()
  const timeline = useTimeline(owner)
  const refresh = useRefreshAll()
  const [editing, setEditing] = useState<TimelineEntry | null>(null)
  const [deleting, setDeleting] = useState<TimelineEntry | null>(null)

  const entries = timeline.data?.pages.flatMap((page) => page.items) ?? []
  const total = timeline.data?.pages[0]?.total ?? 0

  async function save(entry: TimelineEntry, values: ActivityValues) {
    await updateActivity(entry.id, values)
    setEditing(null)
    toast('저장했어요')
    await refresh()
  }

  async function markDone(entry: TimelineEntry, done: boolean) {
    try {
      await updateActivity(entry.id, { follow_up_done: done })
    } catch {
      toast('저장하지 못했어요. 다시 시도해 주세요.', 'error')
      return
    }
    toast(done ? '후속 조치를 완료했어요' : '후속 조치를 다시 열었어요')
    await refresh()
  }

  async function remove() {
    if (!deleting) return
    try {
      await deleteActivity(deleting.id)
    } catch {
      toast('삭제하지 못했어요. 다시 시도해 주세요.', 'error')
      return
    }
    setDeleting(null)
    toast('삭제했어요')
    await refresh()
  }

  const deletingLabel = deleting ? `${kindLabel(meta, deleting.kind)} 기록` : ''
  const retry = failedLoad(timeline)

  return (
    <Panel title="타임라인" aside={timeline.data ? `활동 ${count(total, 'activity')}` : undefined}>
      {retry ? (
        <LoadError onRetry={retry} />
      ) : !timeline.data ? (
        <SkeletonRows rows={4} />
      ) : entries.length === 0 ? (
        <EmptyState message="아직 기록된 활동이 없어요" />
      ) : (
        <ol className={styles.timeline} aria-label="타임라인">
          {entries.map((entry) => (
            <Entry
              key={entry.id}
              entry={entry}
              owner={owner}
              meta={meta}
              onEdit={() => setEditing(entry)}
              onDelete={() => setDeleting(entry)}
              onDone={(done) => markDone(entry, done)}
            />
          ))}
        </ol>
      )}
      {timeline.hasNextPage ? (
        <div className={styles.more}>
          <Button onPress={() => timeline.fetchNextPage()} isDisabled={timeline.isFetchingNextPage}>
            더 보기 ({count(total - entries.length, 'activity')})
          </Button>
        </div>
      ) : null}
      <ActivityEditDialog entry={editing} onSave={save} onClose={() => setEditing(null)} />
      <ConfirmDelete
        isOpen={deleting !== null}
        onOpenChange={(isOpen) => !isOpen && setDeleting(null)}
        message={deleting ? `${deletingLabel}${objectParticle(deletingLabel)} 삭제할까요?` : null}
        onConfirm={remove}
      />
    </Panel>
  )
}

type EntryProps = {
  entry: TimelineEntry
  owner: Owner
  meta: Meta | undefined
  onEdit: () => void
  onDelete: () => void
  onDone: (done: boolean) => void
}

/** One entry: its kind's icon and name, when, what was said, the deal it came
 * from on a contact's timeline, and its follow-up. Automatic entries have no menu (RULE-11). */
function Entry({ entry, owner, meta, onEdit, onDelete, onDone }: EntryProps) {
  const Icon = KIND_ICONS[entry.kind]
  const label = kindLabel(meta, entry.kind)
  const when = formatDateTime(entry.occurred_at)
  return (
    <li className={styles.entry}>
      <span className={entry.automatic ? `${styles.icon} ${styles.automatic}` : styles.icon} aria-hidden="true">
        <Icon size={16} />
      </span>
      <div className={styles.body}>
        <p className={styles.head}>
          <span className={styles.kind}>{label}</span>
          <time dateTime={entry.occurred_at} className={styles.when}>
            {when}
          </time>
        </p>
        <p className={styles.text}>{entry.automatic ? automaticText(meta, entry) : entry.description}</p>
        {owner.kind === 'contact' && entry.deal_id !== null && entry.deal_name ? (
          <p className={styles.on}>
            영업 기회{' '}
            <RecordLink kind="deal" id={entry.deal_id}>
              {entry.deal_name}
            </RecordLink>
          </p>
        ) : null}
        {entry.follow_up_date ? <FollowUp entry={entry} today={meta?.today} onDone={onDone} /> : null}
      </div>
      {entry.automatic ? null : (
        <RowMenu
          label={`${when} ${label} 메뉴`}
          items={[
            { key: 'edit', label: '수정', icon: <Pencil size={16} aria-hidden="true" /> },
            { key: 'delete', label: '삭제', icon: <Trash2 size={16} aria-hidden="true" />, danger: true },
          ]}
          onAction={(key) => (key === 'edit' ? onEdit() : onDelete())}
        />
      )}
    </li>
  )
}

/** A follow-up's date with a box to mark it done; overdue ones say how many days, in Raspberry (RULE-10). */
function FollowUp({ entry, today, onDone }: { entry: TimelineEntry; today: string | undefined; onDone: (done: boolean) => void }) {
  const date = entry.follow_up_date!
  const state = entry.follow_up_state
  return (
    <div className={styles.followUp}>
      <Checkbox isSelected={entry.follow_up_done} onChange={onDone}>
        <span className={entry.follow_up_done ? styles.doneText : undefined}>후속 조치 {formatDateWithWeekday(date)}</span>
      </Checkbox>
      {state === 'overdue' && today ? (
        <span className={styles.overdue}>{daysBetween(date, today)}일 지남</span>
      ) : state === 'today' ? (
        <span className={styles.today}>오늘</span>
      ) : state === 'done' ? (
        <span className={styles.done}>완료</span>
      ) : null}
    </div>
  )
}
