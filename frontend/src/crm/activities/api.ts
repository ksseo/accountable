import { useInfiniteQuery } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '../../api/client'

export type TimelineEntry = Schemas['TimelineEntry']
export type ActivityIn = Schemas['ActivityIn']
export type ActivityPatch = Schemas['ActivityPatch']
export type LoggedKind = ActivityIn['kind']

/** The record a timeline belongs to, and where activities are logged. */
export type Owner = { kind: 'contact' | 'deal'; id: number }

function fetchPage(owner: Owner, offset: number) {
  return owner.kind === 'contact'
    ? unwrap(
        api.GET('/api/contacts/{contact_id}/timeline', {
          params: { path: { contact_id: owner.id }, query: { offset } },
        }),
      )
    : unwrap(
        api.GET('/api/deals/{deal_id}/timeline', {
          params: { path: { deal_id: owner.id }, query: { offset } },
        }),
      )
}

/** A record's timeline, newest first, 50 at a time (RULE-9, REC-4). */
export const useTimeline = (owner: Owner) =>
  useInfiniteQuery({
    queryKey: ['timeline', owner.kind, owner.id],
    queryFn: ({ pageParam }) => fetchPage(owner, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.offset + last.items.length < last.total ? last.offset + last.limit : undefined,
  })

export const logActivity = (body: ActivityIn) => unwrap(api.POST('/api/activities', { body }))

export const updateActivity = (id: number, body: ActivityPatch) =>
  unwrap(api.PATCH('/api/activities/{activity_id}', { params: { path: { activity_id: id } }, body }))

export const deleteActivity = (id: number) =>
  unwrap(api.DELETE('/api/activities/{activity_id}', { params: { path: { activity_id: id } } }))
