import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components'
import { useSearchParams } from 'react-router'
import { failedLoad } from '../../api/failedLoad'
import { count } from '../../lib/korean'
import { Button } from '../../ui/Button'
import { DataTable, type Column } from '../../ui/DataTable/DataTable'
import { PageHeader } from '../../ui/PageHeader'
import { Panel } from '../../ui/Panel'
import { RecordLink, recordPath } from '../../ui/RecordLink'
import { StatusBadge } from '../badges'
import { DeleteRecord } from '../DeleteRecord'
import { statusLabel, useMeta, type StatusKey } from '../meta'
import styles from '../tables.module.css'
import { contactImpact, deleteContact, useContacts, type Contact } from './api'
import { ContactDialog } from './ContactDialog'
import { contactDeleteMessage } from './deleteMessage'

const STATUS_ORDER: Record<StatusKey, number> = { lead: 0, qualified: 1, customer: 2 }
const FILTERS = ['all', 'lead', 'qualified', 'customer'] as const
type Filter = (typeof FILTERS)[number]

const COLUMNS: Column<Contact>[] = [
  {
    key: 'name',
    header: '이름',
    value: (row) => row.name,
    searchable: true,
    cell: (row) => (
      <RecordLink kind="contact" id={row.id}>
        {row.name}
      </RecordLink>
    ),
  },
  {
    key: 'status',
    header: '상태',
    value: (row) => STATUS_ORDER[row.status],
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: 'job_title',
    header: '직책',
    value: (row) => row.job_title,
    searchable: true,
    cell: (row) => row.job_title,
  },
  {
    key: 'organization',
    header: '거래처',
    value: (row) => row.organization_name,
    searchable: true,
    cell: (row) =>
      row.organization_id && row.organization_name ? (
        <RecordLink kind="organization" id={row.organization_id}>
          {row.organization_name}
        </RecordLink>
      ) : null,
  },
  { key: 'email', header: '이메일', value: (row) => row.email, searchable: true, cell: (row) => row.email },
  {
    key: 'phone',
    header: '전화번호',
    nowrap: true,
    value: (row) => row.phone,
    searchable: true,
    cell: (row) => row.phone,
  },
]

/** 연락처: the contacts table with its status filter (TBL-5, TBL-7). */
export function ContactsPage() {
  const contacts = useContacts()
  const { data } = contacts
  const { data: meta } = useMeta()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Contact | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Contact | null>(null)

  const requested = params.get('status')
  const filter: Filter = FILTERS.includes(requested as Filter) ? (requested as Filter) : 'all'

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: data?.length ?? 0, lead: 0, qualified: 0, customer: 0 }
    for (const row of data ?? []) result[row.status] += 1
    return result
  }, [data])
  const rows = useMemo(
    () => (filter === 'all' ? data : data?.filter((row) => row.status === filter)),
    [data, filter],
  )

  const addButton = (
    <Button variant="strong" onPress={() => setEditing('new')}>
      <Plus size={18} aria-hidden="true" />
      연락처 추가
    </Button>
  )

  const statusFilter = (
    <ToggleButtonGroup
      className={styles.segments}
      aria-label="상태"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[filter]}
      onSelectionChange={(keys) => {
        const [key] = [...keys]
        setParams((current) => {
          const next = new URLSearchParams(current)
          if (!key || key === 'all') next.delete('status')
          else next.set('status', String(key))
          next.delete('page')
          return next
        })
      }}
    >
      {FILTERS.map((key) => (
        <ToggleButton key={key} id={key} className={styles.segment}>
          {key === 'all' ? '전체' : statusLabel(meta, key)}
          {data ? <span className={styles.segmentCount}>{counts[key].toLocaleString('ko-KR')}</span> : null}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )

  return (
    <>
      <PageHeader
        title="연락처"
        summary={
          data ? `연락처 ${count(counts.all, 'contact')} · 고객 ${count(counts.customer, 'contact')}` : ' '
        }
        actions={addButton}
      />
      <Panel>
        <DataTable
          caption="연락처 목록"
          rows={rows}
          onRetry={failedLoad(contacts)}
          totalCount={data?.length ?? 0}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          rowHref={(row) => recordPath('contact', row.id)}
          rowName={(row) => row.name}
          searchLabel="연락처 검색"
          searchPlaceholder="이름, 이메일, 전화번호, 직책, 거래처로 검색"
          defaultSort={{ key: 'name', direction: 'asc' }}
          toolbar={statusFilter}
          onEdit={setEditing}
          onDelete={setDeleting}
          empty={{ message: '아직 연락처가 없어요', action: addButton }}
          noMatchMessage={`${filter === 'all' ? '' : statusLabel(meta, filter)} 연락처가 없어요`.trim()}
        />
      </Panel>
      <ContactDialog target={editing} onClose={() => setEditing(null)} />
      <DeleteRecord
        target={deleting}
        onClose={() => setDeleting(null)}
        kind="contacts"
        loadImpact={contactImpact}
        message={contactDeleteMessage}
        remove={deleteContact}
      />
    </>
  )
}
