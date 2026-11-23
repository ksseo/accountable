import { useQuery } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '../api/client'

export type Meta = Schemas['Meta']
export type StageKey = Schemas['StageInfo']['key']
export type StatusKey = Schemas['StatusInfo']['key']
export type ActivityKind = Schemas['ActivityKindInfo']['key']

export const OPEN_STAGES = ['new', 'qualified', 'proposal', 'negotiation'] as const
export const CLOSED_STAGES = ['won', 'lost'] as const
export const STAGES: readonly StageKey[] = [...OPEN_STAGES, ...CLOSED_STAGES]

export const isClosed = (stage: StageKey) => stage === 'won' || stage === 'lost'

/** Stages, statuses, kinds, industries in use and today, from the backend.
 * The frontend takes today from here, never from the computer's clock. */
export function useMeta() {
  return useQuery({ queryKey: ['meta'], queryFn: () => unwrap(api.GET('/api/meta')) })
}

export function stageLabel(meta: Meta | undefined, stage: StageKey): string {
  return meta?.stages.find((item) => item.key === stage)?.label ?? stage
}

export function statusLabel(meta: Meta | undefined, status: StatusKey): string {
  return meta?.statuses.find((item) => item.key === status)?.label ?? status
}

export function usualProbability(meta: Meta | undefined, stage: StageKey): number | undefined {
  return meta?.stages.find((item) => item.key === stage)?.probability
}

export function kindLabel(meta: Meta | undefined, kind: ActivityKind): string {
  return meta?.activity_kinds.find((item) => item.key === kind)?.label ?? kind
}
