import { Link } from 'react-router'
import { ApiError, isOffline } from '../api/client'
import { LoadError } from '../ui/LoadError'
import { PageHeader } from '../ui/PageHeader'
import { Panel } from '../ui/Panel'
import { SkeletonRows } from '../ui/Skeleton'

type Props = { error: unknown; listPath: string; listLabel: string; onRetry: () => void }

/** What a record page shows while it loads, when the record isn't there, or
 * when it couldn't be loaded. */
export function RecordPending({ error, listPath, listLabel, onRetry }: Props) {
  // 422 is an address with no record number in it, such as /deals/abc.
  if (error instanceof ApiError && (error.status === 404 || error.status === 422)) {
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
  const failed = Boolean(error) && !isOffline(error)
  return (
    <>
      <PageHeader title={failed ? listLabel : ' '} />
      <Panel>{failed ? <LoadError onRetry={onRetry} /> : <SkeletonRows rows={4} />}</Panel>
    </>
  )
}

export const recordId = (value: string | undefined) => Number(value)
