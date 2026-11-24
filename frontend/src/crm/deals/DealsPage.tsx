import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Switch } from 'react-aria-components'
import { useSearchParams } from 'react-router'
import { failedLoad } from '../../api/failedLoad'
import { formatDate } from '../../lib/dates'
import { count } from '../../lib/korean'
import { formatMoney, formatPercent } from '../../lib/money'
import { Button } from '../../ui/Button'
import { DataTable, type Column } from '../../ui/DataTable/DataTable'
import { PageHeader } from '../../ui/PageHeader'
import { Panel } from '../../ui/Panel'
import { RecordLink, recordPath } from '../../ui/RecordLink'
import { LateBadge, StageBadge } from '../badges'
import { DeleteRecord } from '../DeleteRecord'
import { isClosed, STAGES } from '../meta'
import { useDealForm } from '../openForms'
import styles from '../tables.module.css'
import { dealImpact, deleteDeal, useDeals, type Deal } from './api'
import { dealDeleteMessage } from './deleteMessage'

const COLUMNS: Column<Deal>[] = [
  {
    key: 'name',
    header: '이름',
    value: (row) => row.name,
    searchable: true,
    cell: (row) => (
      <RecordLink kind="deal" id={row.id}>
        {row.name}
      </RecordLink>
    ),
  },
  {
    key: 'stage',
    header: '단계',
    value: (row) => STAGES.indexOf(row.stage),
    cell: (row) => <StageBadge stage={row.stage} />,
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
  {
    key: 'contact',
    header: '주 연락처',
    value: (row) => row.contact_name,
    searchable: true,
    cell: (row) =>
      row.contact_id && row.contact_name ? (
        <RecordLink kind="contact" id={row.contact_id}>
          {row.contact_name}
        </RecordLink>
      ) : null,
  },
  {
    key: 'value',
    header: '금액',
    align: 'end',
    nowrap: true,
    value: (row) => row.value,
    cell: (row) => formatMoney(row.value),
  },
  {
    key: 'probability',
    header: '확률',
    align: 'end',
    value: (row) => row.probability,
    cell: (row) => formatPercent(row.probability),
  },
  {
    key: 'expected',
    header: '예상 매출',
    align: 'end',
    nowrap: true,
    value: (row) => row.expected_revenue,
    cell: (row) => formatMoney(row.expected_revenue),
  },
  {
    key: 'close_date',
    header: '마감일',
    nowrap: true,
    value: (row) => row.close_date,
    cell: (row) =>
      row.close_date ? (
        <span className={styles.closeDate}>
          <span className={row.is_late ? styles.late : undefined}>{formatDate(row.close_date)}</span>
          {row.is_late ? <LateBadge /> : null}
        </span>
      ) : null,
  },
]

/** 영업 기회: the deals table with "지연된 것만" (TBL-5, TBL-8). */
export function DealsPage() {
  const deals = useDeals()
  const { data } = deals
  const dealForm = useDealForm()
  const [params, setParams] = useSearchParams()
  const [deleting, setDeleting] = useState<Deal | null>(null)

  const lateOnly = params.get('late') === '1'
  const open = data?.filter((row) => !isClosed(row.stage)).length ?? 0
  const late = data?.filter((row) => row.is_late).length ?? 0
  const rows = useMemo(() => (lateOnly ? data?.filter((row) => row.is_late) : data), [data, lateOnly])

  const addButton = (
    <Button variant="dark" onPress={() => dealForm.openNew()}>
      <Plus size={18} aria-hidden="true" />
      영업 기회 추가
    </Button>
  )

  const lateSwitch = (
    <Switch
      className={styles.switch}
      isSelected={lateOnly}
      onChange={(selected) =>
        setParams((current) => {
          const next = new URLSearchParams(current)
          if (selected) next.set('late', '1')
          else next.delete('late')
          next.delete('page')
          return next
        })
      }
    >
      <span className={styles.track} aria-hidden="true" />
      지연된 것만
      {data ? <span className={styles.segmentCount}>{late.toLocaleString('ko-KR')}</span> : null}
    </Switch>
  )

  return (
    <>
      <PageHeader
        title="영업 기회"
        summary={
          data
            ? `영업 기회 ${count(data.length, 'deal')} · 진행 중 ${count(open, 'deal')} · 지연 ${count(late, 'deal')}`
            : ' '
        }
      />
      <Panel>
        <DataTable
          caption="영업 기회 목록"
          rows={rows}
          onRetry={failedLoad(deals)}
          totalCount={data?.length ?? 0}
          columns={COLUMNS}
          rowKey={(row) => row.id}
          rowHref={(row) => recordPath('deal', row.id)}
          rowName={(row) => row.name}
          searchLabel="영업 기회 검색"
          searchPlaceholder="이름, 거래처, 주 연락처로 검색"
          defaultSort={{ key: 'close_date', direction: 'asc' }}
          toolbar={lateSwitch}
          onEdit={dealForm.openEdit}
          onDelete={setDeleting}
          empty={{ message: '아직 영업 기회가 없어요', action: addButton }}
          noMatchMessage="지연된 영업 기회가 없어요"
        />
      </Panel>
      <DeleteRecord
        target={deleting}
        onClose={() => setDeleting(null)}
        kind="deals"
        loadImpact={dealImpact}
        message={dealDeleteMessage}
        remove={deleteDeal}
      />
    </>
  )
}
