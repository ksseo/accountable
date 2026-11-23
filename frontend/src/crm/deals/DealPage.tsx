import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '../../app/toastStore'
import { formatDate } from '../../lib/dates'
import { objectParticle, quoted } from '../../lib/korean'
import { formatMoney, formatPercent } from '../../lib/money'
import { PageHeader } from '../../ui/PageHeader'
import { Panel } from '../../ui/Panel'
import { RecordLink } from '../../ui/RecordLink'
import { Select } from '../../ui/Select'
import { LogActivity, Timeline } from '../activities/Timeline'
import { LateBadge } from '../badges'
import { DeleteRecord } from '../DeleteRecord'
import { useRefreshAll } from '../forms'
import { stageLabel, STAGES, useMeta, type StageKey } from '../meta'
import { MOVE_FAILED } from '../pipeline/announcements'
import { moveDeal } from '../pipeline/api'
import { recordId, RecordPending } from '../RecordMissing'
import { Details, Figures, Joined, RecordActions } from '../RecordParts'
import styles from '../records.module.css'
import { dealImpact, deleteDeal, useDeal, type Deal } from './api'
import { useDealForm } from './DealFormHost'
import { dealDeleteMessage } from './deleteMessage'

/** A deal's page (REC-3). */
export function DealPage() {
  const id = recordId(useParams().id)
  const { data, error } = useDeal(id)
  if (!data) return <RecordPending error={error} listPath="/deals" listLabel="영업 기회" />
  return <DealRecord deal={data} />
}

function DealRecord({ deal }: { deal: Deal }) {
  const { data: meta } = useMeta()
  const dealForm = useDealForm()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const owner = { kind: 'deal', id: deal.id } as const

  return (
    <>
      <PageHeader
        title={deal.name}
        summary={
          <Joined
            parts={[
              deal.organization_id !== null && deal.organization_name ? (
                <RecordLink kind="organization" id={deal.organization_id}>
                  {deal.organization_name}
                </RecordLink>
              ) : null,
              deal.contact_id !== null && deal.contact_name ? (
                <RecordLink kind="contact" id={deal.contact_id}>
                  {deal.contact_name}
                </RecordLink>
              ) : null,
              `${stageLabel(meta, deal.stage)} 단계`,
            ]}
          />
        }
        actions={<RecordActions onEdit={() => dealForm.openEdit(deal)} onDelete={() => setDeleting(true)} />}
      />
      <div className={styles.grid}>
        <div className={styles.column}>
          <Panel title="정보">
            <div className={styles.details}>
              <StageSelect deal={deal} />
              <Figures
                items={[
                  { label: '금액', value: formatMoney(deal.value) },
                  { label: '확률', value: formatPercent(deal.probability) },
                  { label: '예상 매출', value: formatMoney(deal.expected_revenue) },
                ]}
              />
              <Details
                items={[
                  {
                    label: '마감일',
                    value: deal.close_date ? (
                      <span className={styles.rowTitle}>
                        {formatDate(deal.close_date)}
                        {deal.is_late ? <LateBadge days={deal.days_late} /> : null}
                      </span>
                    ) : null,
                  },
                  {
                    label: '거래처',
                    value:
                      deal.organization_id !== null && deal.organization_name ? (
                        <RecordLink kind="organization" id={deal.organization_id}>
                          {deal.organization_name}
                        </RecordLink>
                      ) : null,
                  },
                  {
                    label: '주 연락처',
                    value:
                      deal.contact_id !== null && deal.contact_name ? (
                        <RecordLink kind="contact" id={deal.contact_id}>
                          {deal.contact_name}
                        </RecordLink>
                      ) : null,
                  },
                ]}
              />
            </div>
          </Panel>
        </div>
        <div className={styles.column}>
          <LogActivity owner={owner} />
          <Timeline owner={owner} />
        </div>
      </div>
      <DeleteRecord
        target={deleting ? deal : null}
        onClose={() => setDeleting(false)}
        kind="deals"
        loadImpact={dealImpact}
        message={dealDeleteMessage}
        remove={deleteDeal}
        onDeleted={() => navigate('/deals', { replace: true, flushSync: true })}
      />
    </>
  )
}

/** Moving the deal to another stage, the same as on the board (RULE-3). It
 * goes to the top of the new stage's column. */
function StageSelect({ deal }: { deal: Deal }) {
  const { data: meta } = useMeta()
  const refresh = useRefreshAll()
  // The stage picked while the move is saved, so the list doesn't jump back.
  const [picked, setPicked] = useState<StageKey | null>(null)

  async function move(stage: StageKey) {
    if (stage === deal.stage) return
    setPicked(stage)
    try {
      const saved = await moveDeal(deal.id, { stage, after_id: null, before_id: null })
      toast(`${quoted(deal.name, objectParticle)} ${stageLabel(meta, stage)} 단계로 옮겼어요`)
      if (saved.promoted_contact) toast(`${saved.promoted_contact.name} 님이 고객이 되었어요`)
    } catch {
      toast(MOVE_FAILED, 'error')
    }
    await refresh()
    setPicked(null)
  }

  return (
    <div className={styles.stage}>
      <Select
        label="단계"
        name="stage"
        options={STAGES.map((key) => ({ key, label: stageLabel(meta, key) }))}
        value={picked ?? deal.stage}
        onChange={move}
      />
    </div>
  )
}
