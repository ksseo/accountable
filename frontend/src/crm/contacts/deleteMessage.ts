import { count } from '../../lib/korean'
import type { ContactImpact } from './api'

/** "‘김민준’ 님을 삭제할까요? 영업 기회 2건은 그대로 남고 주 연락처가 비워져요.
 * 이 연락처에 기록된 활동 5건은 함께 삭제돼요." (DEL-2) */
export function contactDeleteMessage(name: string, impact: ContactImpact): string {
  return [
    `‘${name}’ 님을 삭제할까요?`,
    impact.deals ? `영업 기회 ${count(impact.deals, 'deal')}은 그대로 남고 주 연락처가 비워져요.` : '',
    impact.activities ? `이 연락처에 기록된 활동 ${count(impact.activities, 'activity')}은 함께 삭제돼요.` : '',
  ]
    .filter(Boolean)
    .join(' ')
}
