import { useQuery } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '../../api/client'

export type Deal = Schemas['Deal']
export type DealSaved = Schemas['DealSaved']
export type DealIn = Schemas['DealIn']
export type DealImpact = Schemas['DealImpact']

export const useDeals = () => useQuery({ queryKey: ['deals'], queryFn: () => unwrap(api.GET('/api/deals')) })

export const useDeal = (id: number) =>
  useQuery({
    queryKey: ['deals', id],
    queryFn: () => unwrap(api.GET('/api/deals/{deal_id}', { params: { path: { deal_id: id } } })),
  })

export function saveDeal(id: number | null, body: DealIn): Promise<DealSaved> {
  if (id === null) return unwrap(api.POST('/api/deals', { body }))
  return unwrap(api.PATCH('/api/deals/{deal_id}', { params: { path: { deal_id: id } }, body }))
}

export const dealImpact = (id: number) =>
  unwrap(api.GET('/api/deals/{deal_id}/delete-impact', { params: { path: { deal_id: id } } }))

export const deleteDeal = (id: number) => unwrap(api.DELETE('/api/deals/{deal_id}', { params: { path: { deal_id: id } } }))
