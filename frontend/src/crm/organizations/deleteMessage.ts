import { count, objectParticle, quoted, topicParticle, withParticle } from '../../lib/korean'
import type { OrganizationImpact } from './api'

/** "‘한빛정밀’을 삭제할까요? 연락처 3명과 영업 기회 2건은 그대로 남고, 거래처 연결만 해제돼요." (DEL-2) */
export function organizationDeleteMessage(name: string, impact: OrganizationImpact): string {
  const question = `${quoted(name, objectParticle)} 삭제할까요?`
  const linked = [
    impact.contacts ? `연락처 ${count(impact.contacts, 'contact')}` : '',
    impact.deals ? `영업 기회 ${count(impact.deals, 'deal')}` : '',
  ].filter(Boolean)
  if (linked.length === 0) return `${question} 연결된 연락처와 영업 기회는 없어요.`
  const both = linked.length === 2 ? `${linked[0]}${withParticle(linked[0])} ${linked[1]}` : linked[0]
  return `${question} ${both}${topicParticle(both)} 그대로 남고, 거래처 연결만 해제돼요.`
}
