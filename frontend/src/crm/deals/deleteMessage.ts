import { count, objectParticle, quoted } from '../../lib/korean'
import type { DealImpact } from './api'

/** "‘2027 포장재 공급’을 삭제할까요? 이 영업 기회에 기록된 활동 7건(단계 변경 기록 포함)이
 * 함께 삭제돼요." (DEL-2) */
export function dealDeleteMessage(name: string, impact: DealImpact): string {
  const question = `${quoted(name, objectParticle)} 삭제할까요?`
  if (!impact.activities) return question
  return `${question} 이 영업 기회에 기록된 활동 ${count(impact.activities, 'activity')}(단계 변경 기록 포함)이 함께 삭제돼요.`
}
