import { Link } from 'react-router'
import { PageHeader } from '../ui/PageHeader'

export function NotFoundPage() {
  return (
    <PageHeader
      title="페이지를 찾을 수 없어요"
      summary={
        <>
          주소를 확인하거나 <Link to="/">대시보드</Link>로 돌아가 주세요.
        </>
      }
    />
  )
}
