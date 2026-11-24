import { ArrowRightLeft, FileText, Mail, Phone, UserCheck, type LucideIcon } from 'lucide-react'
import { kindLabel, stageLabel, statusLabel, type ActivityKind, type Meta, type StageKey, type StatusKey } from '../meta'
import type { LoggedKind, TimelineEntry } from './api'

export const LOGGED_KINDS: readonly LoggedKind[] = ['note', 'call', 'email']

export const KIND_ICONS: Record<ActivityKind, LucideIcon> = {
  note: FileText,
  call: Phone,
  email: Mail,
  stage_change: ArrowRightLeft,
  status_change: UserCheck,
}

/** What an automatic entry says: "제안 → 협상", or "적격 → 고객 (‘2027 포장재 공급’ 수주)" (RULE-3, RULE-7). */
export function automaticText(
  meta: Meta | undefined,
  entry: Pick<TimelineEntry, 'kind' | 'from_value' | 'to_value' | 'description'>,
): string {
  if (entry.kind === 'stage_change') {
    return `${stageLabel(meta, entry.from_value as StageKey)} → ${stageLabel(meta, entry.to_value as StageKey)}`
  }
  const change = `${statusLabel(meta, entry.from_value as StatusKey)} → ${statusLabel(meta, entry.to_value as StatusKey)}`
  return entry.description ? `${change} (‘${entry.description}’ ${stageLabel(meta, 'won')})` : change
}

export { kindLabel }
