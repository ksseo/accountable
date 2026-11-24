import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { formatDate } from '../../lib/dates'
import { count } from '../../lib/korean'
import { formatMoney } from '../../lib/money'
import { EmptyState } from '../../ui/EmptyState'
import { PageHeader } from '../../ui/PageHeader'
import { Panel } from '../../ui/Panel'
import { RecordLink } from '../../ui/RecordLink'
import { LogActivity, Timeline } from '../activities/Timeline'
import { LateBadge, StageBadge, StatusBadge } from '../badges'
import { DeleteRecord } from '../DeleteRecord'
import { useDealForm } from '../openForms'
import { recordId, RecordPending } from '../RecordMissing'
import { AddButton, Details, Joined, LinkedList, LinkedRow, RecordActions } from '../RecordParts'
import styles from '../records.module.css'
import { contactImpact, deleteContact, useContact, type ContactDetail } from './api'
import { ContactDialog } from './ContactDialog'
import { contactDeleteMessage } from './deleteMessage'

/** A contact's page (REC-2). */
export function ContactPage() {
  const { data, error, refetch } = useContact(recordId(useParams().id))
  if (!data) return <RecordPending error={error} listPath="/contacts" listLabel="연락처" onRetry={() => refetch()} />
  return <ContactRecord contact={data} />
}

function ContactRecord({ contact }: { contact: ContactDetail }) {
  const dealForm = useDealForm()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const owner = { kind: 'contact', id: contact.id } as const
  const organization =
    contact.organization_id !== null && contact.organization_name ? (
      <RecordLink kind="organization" id={contact.organization_id}>
        {contact.organization_name}
      </RecordLink>
    ) : null

  return (
    <>
      <PageHeader
        title={contact.name}
        summary={<Joined parts={[contact.job_title, organization]} />}
        actions={<RecordActions onEdit={() => setEditing(true)} onDelete={() => setDeleting(true)} />}
      />
      <div className={styles.grid}>
        <div className={styles.column}>
          <Panel title="정보">
            <Details
              items={[
                { label: '상태', value: <StatusBadge status={contact.status} /> },
                { label: '직책', value: contact.job_title },
                { label: '거래처', value: organization },
                { label: '이메일', value: contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null },
                { label: '전화번호', value: contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : null },
              ]}
            />
          </Panel>
          <Panel
            title="영업 기회"
            aside={
              <AddButton
                label={`${contact.name} 님의 영업 기회 추가`}
                onPress={() => dealForm.openNew({ contact_id: contact.id, organization_id: contact.organization_id })}
              />
            }
          >
            {contact.deals.length === 0 ? (
              <EmptyState message="주 연락처로 있는 영업 기회가 없어요" />
            ) : (
              <LinkedList label={`주 연락처로 있는 영업 기회 ${count(contact.deals.length, 'deal')}`}>
                {contact.deals.map((deal) => (
                  <LinkedRow
                    key={deal.id}
                    main={
                      <>
                        <RecordLink kind="deal" id={deal.id}>
                          {deal.name}
                        </RecordLink>
                        <StageBadge stage={deal.stage} />
                        {deal.is_late ? <LateBadge days={deal.days_late} /> : null}
                      </>
                    }
                    meta={
                      <Joined
                        parts={[
                          deal.organization_id !== null && deal.organization_name ? (
                            <RecordLink kind="organization" id={deal.organization_id} quiet>
                              {deal.organization_name}
                            </RecordLink>
                          ) : null,
                          deal.close_date ? `마감 ${formatDate(deal.close_date)}` : '마감일 없음',
                        ]}
                      />
                    }
                    end={formatMoney(deal.value)}
                  />
                ))}
              </LinkedList>
            )}
          </Panel>
        </div>
        <div className={styles.column}>
          <LogActivity owner={owner} />
          <Timeline owner={owner} />
        </div>
      </div>
      <ContactDialog target={editing ? contact : null} onClose={() => setEditing(false)} />
      <DeleteRecord
        target={deleting ? contact : null}
        onClose={() => setDeleting(false)}
        kind="contacts"
        loadImpact={contactImpact}
        message={contactDeleteMessage}
        remove={deleteContact}
        onDeleted={() => navigate('/contacts', { replace: true, flushSync: true })}
      />
    </>
  )
}
