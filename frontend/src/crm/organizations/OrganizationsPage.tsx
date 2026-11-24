import { Plus } from 'lucide-react'
import { useState } from 'react'
import { failedLoad } from '../../api/failedLoad'
import { count } from '../../lib/korean'
import { formatMoney } from '../../lib/money'
import { Button } from '../../ui/Button'
import { DataTable, type Column } from '../../ui/DataTable/DataTable'
import { PageHeader } from '../../ui/PageHeader'
import { Panel } from '../../ui/Panel'
import { RecordLink, recordPath } from '../../ui/RecordLink'
import { DeleteRecord } from '../DeleteRecord'
import { deleteOrganization, organizationImpact, useOrganizations, type OrganizationRow } from './api'
import { organizationDeleteMessage } from './deleteMessage'
import { OrganizationDialog } from './OrganizationDialog'
import styles from '../tables.module.css'

const COLUMNS: Column<OrganizationRow>[] = [
  {
    key: 'name',
    header: '이름',
    value: (row) => row.name,
    searchable: true,
    cell: (row) => (
      <RecordLink kind="organization" id={row.id}>
        {row.name}
      </RecordLink>
    ),
  },
  { key: 'industry', header: '업종', value: (row) => row.industry, searchable: true, cell: (row) => row.industry },
  {
    key: 'website',
    header: '웹사이트',
    value: (row) => row.website,
    searchable: true,
    cell: (row) =>
      row.website ? (
        <a className={styles.external} href={row.website} target="_blank" rel="noreferrer">
          {row.website.replace(/^https?:\/\//, '')}
        </a>
      ) : null,
  },
  {
    key: 'contacts',
    header: '연락처 수',
    align: 'end',
    value: (row) => row.contact_count,
    cell: (row) => count(row.contact_count, 'contact'),
  },
  {
    key: 'open',
    header: '진행 중 영업 기회',
    align: 'end',
    nowrap: true,
    value: (row) => row.open_deal_value,
    cell: (row) =>
      row.open_deal_count ? (
        <>
          <span className={styles.muted}>{count(row.open_deal_count, 'deal')} · </span>
          {formatMoney(row.open_deal_value)}
        </>
      ) : (
        <span className={styles.muted}>없음</span>
      ),
  },
]

/** 거래처: the organizations table (TBL-5). */
export function OrganizationsPage() {
  const organizations = useOrganizations()
  const { data } = organizations
  const [editing, setEditing] = useState<OrganizationRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<OrganizationRow | null>(null)

  const linkedContacts = data?.reduce((total, row) => total + row.contact_count, 0) ?? 0
  const addButton = (
    <Button variant="dark" onPress={() => setEditing('new')}>
      <Plus size={18} aria-hidden="true" />
      거래처 추가
    </Button>
  )

  return (
    <>
      <PageHeader
        title="거래처"
        summary={data ? `거래처 ${count(data.length, 'organization')} · 연결된 연락처 ${count(linkedContacts, 'contact')}` : ' '}
        actions={addButton}
      />
      <Panel>
        <DataTable
          caption="거래처 목록"
          rows={data}
          onRetry={failedLoad(organizations)}
          totalCount={data?.length ?? 0}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          rowHref={(row) => recordPath('organization', row.id)}
          rowName={(row) => row.name}
          searchLabel="거래처 검색"
          searchPlaceholder="이름, 업종, 웹사이트로 검색"
          defaultSort={{ key: 'name', direction: 'asc' }}
          onEdit={setEditing}
          onDelete={setDeleting}
          empty={{ message: '아직 거래처가 없어요', action: addButton }}
        />
      </Panel>
      <OrganizationDialog target={editing} onClose={() => setEditing(null)} />
      <DeleteRecord
        target={deleting}
        onClose={() => setDeleting(null)}
        kind="organizations"
        loadImpact={organizationImpact}
        message={organizationDeleteMessage}
        remove={deleteOrganization}
      />
    </>
  )
}
