import { api, unwrap, type Schemas } from '../../api/client'

/** Saves a move: the new stage and the cards above and below (PIPE-6). */
export const moveDeal = (id: number, body: Schemas['DealMove']) =>
  unwrap(api.POST('/api/deals/{deal_id}/move', { params: { path: { deal_id: id } }, body }))

export const MOVE_FAILED = '이동하지 못했어요. 다시 시도해 주세요.'
