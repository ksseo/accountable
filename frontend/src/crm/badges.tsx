import { Clock } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { stageLabel, statusLabel, useMeta, type StageKey, type StatusKey } from './meta'

// Each stage's colors (LOOK-5). Small white text needs the deep shade, so
// Negotiation's badge uses deep Cerulean rather than the Cerulean fill.
export const STAGE_COLORS: Record<
  StageKey,
  { fill: string; ink: string; on: string; tint: string; badge: string }
> = {
  new: {
    fill: 'var(--stage-new)',
    ink: 'var(--stage-new-ink)',
    on: 'var(--stage-new-on)',
    tint: 'var(--stage-new-tint)',
    badge: 'var(--stage-new)',
  },
  qualified: {
    fill: 'var(--stage-qualified)',
    ink: 'var(--stage-qualified-ink)',
    on: 'var(--stage-qualified-on)',
    tint: 'var(--stage-qualified-tint)',
    badge: 'var(--stage-qualified)',
  },
  proposal: {
    fill: 'var(--stage-proposal)',
    ink: 'var(--stage-proposal-ink)',
    on: 'var(--stage-proposal-on)',
    tint: 'var(--stage-proposal-tint)',
    badge: 'var(--stage-proposal)',
  },
  negotiation: {
    fill: 'var(--stage-negotiation)',
    ink: 'var(--stage-negotiation-ink)',
    on: 'var(--stage-negotiation-on)',
    tint: 'var(--stage-negotiation-tint)',
    badge: 'var(--stage-negotiation-chip)',
  },
  won: {
    fill: 'var(--stage-won)',
    ink: 'var(--stage-won-ink)',
    on: 'var(--stage-won-on)',
    tint: 'var(--stage-won-tint)',
    badge: 'var(--stage-won)',
  },
  lost: {
    fill: 'var(--stage-lost)',
    ink: 'var(--stage-lost-ink)',
    on: 'var(--stage-lost-on)',
    tint: 'var(--stage-lost-tint)',
    badge: 'var(--stage-lost)',
  },
}

const STATUS_COLORS: Record<StatusKey, { fill: string; ink: string }> = {
  lead: { fill: 'var(--marigold)', ink: 'var(--midnight)' },
  qualified: { fill: 'var(--cerulean-deep)', ink: 'var(--on-deep)' },
  customer: { fill: 'var(--sea-green)', ink: 'var(--midnight)' },
}

export function StageBadge({ stage }: { stage: StageKey }) {
  const { data: meta } = useMeta()
  const colors = STAGE_COLORS[stage]
  return (
    <Badge fill={colors.badge} ink={colors.on}>
      {stageLabel(meta, stage)}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: StatusKey }) {
  const { data: meta } = useMeta()
  const colors = STATUS_COLORS[status]
  return (
    <Badge fill={colors.fill} ink={colors.ink}>
      {statusLabel(meta, status)}
    </Badge>
  )
}

/** "지연", or "지연 9일" with the days. Raspberry means late and nothing else (LOOK-5). */
export function LateBadge({ days }: { days?: number }) {
  return (
    <Badge fill="var(--raspberry-deep)" ink="var(--on-deep)" icon={<Clock size={14} aria-hidden="true" />}>
      {days ? `지연 ${days}일` : '지연'}
    </Badge>
  )
}
