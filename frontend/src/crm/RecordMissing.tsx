import { Link } from 'react-router'
import { ApiError } from '../api/client'
import { PageHeader } from '../ui/PageHeader'
import { Panel } from '../ui/Panel'
import { SkeletonRows } from '../ui/Skeleton'

/** What a record page shows while it loads, or when the record isn't there. */
export function RecordPending({ error, listPath, listLabel }: { error: unknown; listPath: string; listLabel: string }) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <PageHeader
        title="찾을 수 없어요"
        summary={
          <>
            삭제되었거나 주소가 잘못되었어요. <Link to={listPath}>{listLabel} 목록</Link>으로 돌아가 주세요.
          </>
        }
      />
    )
  }
  return (
    <>
      <PageHeader title=" " />
      <Panel>
        <SkeletonRows rows={4} />
      </Panel>
    </>
  )
}

export const recordId = (value: string | undefined) => Number(value)
