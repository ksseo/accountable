import { useQuery } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '../../api/client'

export const PIPELINE_KEY = ['pipeline'] as const

export const usePipeline = () => useQuery({ queryKey: PIPELINE_KEY, queryFn: () => unwrap(api.GET('/api/pipeline')) })

/** Saves a move: the new stage and the cards above and below (PIPE-6). */
export const moveDeal = (id: number, body: Schemas['DealMove']) =>
  unwrap(api.POST('/api/deals/{deal_id}/move', { params: { path: { deal_id: id } }, body }))
