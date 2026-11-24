import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { formatDate } from '../../lib/dates'
import { count } from '../../lib/korean'
import { formatMoney } from '../../lib/money'
import { EmptyState } from '../../ui/EmptyState'
import { PageHeader } from '../../ui/PageHeader'
import { Panel } from '../../ui/Panel'
import { RecordLink } from '../../ui/RecordLink'
import { LateBadge, StageBadge, StatusBadge } from '../badges'
import { DeleteRecord } from '../DeleteRecord'
import { useContactForm, useDealForm } from '../openForms'
import { recordId, RecordPending } from '../RecordMissing'
import { AddButton, Details, Figures, Joined, LinkedList, LinkedRow, RecordActions, WebsiteLink } from '../RecordParts'
import styles from '../records.module.css'
import { deleteOrganization, organizationImpact, useOrganization, type OrganizationDetail } from './api'
import { organizationDeleteMessage } from './deleteMessage'
import { OrganizationDialog } from './OrganizationDialog'

/** An organization's page (REC-1). */
export function OrganizationPage() {
  const { data, error, refetch } = useOrganization(recordId(useParams().id))
  if (!data) return <RecordPending error={error} listPath="/organizations" listLabel="거래처" onRetry={() => refetch()} />
  return <OrganizationRecord organization={data} />
}

function OrganizationRecord({ organization }: { organization: OrganizationDetail }) {
  const contactForm = useContactForm()
  const dealForm = useDealForm()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const wonCount = organization.deals.filter((deal) => deal.stage === 'won').length

  return (
    <>
      <PageHeader
        title={organization.name}
        summary={
          <Joined
            parts={[
              organization.industry,
              `연락처 ${count(organization.contacts.length, 'contact')}`,
              `영업 기회 ${count(organization.deals.length, 'deal')}`,
            ]}
          />
        }
        actions={<RecordActions onEdit={() => setEditing(true)} onDelete={() => setDeleting(true)} />}
      />
      <div className={styles.grid}>
        <div className={styles.column}>
          <Panel title="정보">
            <Details
              items={[
                { label: '업종', value: organization.industry },
                { label: '웹사이트', value: organization.website ? <WebsiteLink url={organization.website} /> : null },
                { label: '비고', value: organization.notes },
              ]}
            />
          </Panel>
          <Panel
            title="연락처"
            aside={
              <AddButton
                label={`${organization.name}에 연락처 추가`}
                onPress={() => contactForm.openNew({ organization_id: organization.id })}
              />
            }
          >
            {organization.contacts.length === 0 ? (
              <EmptyState message="아직 연락처가 없어요" />
            ) : (
              <LinkedList label={`연락처 ${count(organization.contacts.length, 'contact')}`}>
                {organization.contacts.map((contact) => (
                  <LinkedRow
                    key={contact.id}
                    main={
                      <>
                        <RecordLink kind="contact" id={contact.id}>
                          {contact.name}
                        </RecordLink>
                        <StatusBadge status={contact.status} />
                      </>
                    }
                    meta={<Joined parts={[contact.job_title, contact.email, contact.phone]} />}
                  />
                ))}
              </LinkedList>
            )}
          </Panel>
        </div>
        <div className={styles.column}>
          <Panel>
            <Figures
              items={[
                {
                  label: '진행 중 파이프라인',
                  value: formatMoney(organization.open_deal_value),
                  note: `영업 기회 ${count(organization.open_deal_count, 'deal')}`,
                },
                { label: '수주 매출', value: formatMoney(organization.won_value), note: `수주 ${count(wonCount, 'deal')}` },
              ]}
            />
          </Panel>
          <Panel
            title="영업 기회"
            aside={
              <AddButton
                label={`${organization.name}에 영업 기회 추가`}
                onPress={() => dealForm.openNew({ organization_id: organization.id })}
              />
            }
          >
            {organization.deals.length === 0 ? (
              <EmptyState message="아직 영업 기회가 없어요" />
            ) : (
              <LinkedList label={`영업 기회 ${count(organization.deals.length, 'deal')}`}>
                {organization.deals.map((deal) => (
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
                          deal.contact_id !== null && deal.contact_name ? (
                            <RecordLink kind="contact" id={deal.contact_id}>
                              {deal.contact_name}
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
      </div>
      <OrganizationDialog target={editing ? organization : null} onClose={() => setEditing(false)} />
      <DeleteRecord
        target={deleting ? organization : null}
        onClose={() => setDeleting(false)}
        kind="organizations"
        loadImpact={organizationImpact}
        message={organizationDeleteMessage}
        remove={deleteOrganization}
        onDeleted={() => navigate('/organizations', { replace: true, flushSync: true })}
      />
    </>
  )
}
