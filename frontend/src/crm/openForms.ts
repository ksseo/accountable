// Opening the deal and contact forms from a page of any feature. The forms list
// contacts and organizations, so pages that imported them would have features
// importing each other. Each form's own feature provides its context instead.

import { createContext, useContext } from 'react'
import type { Schemas } from '../api/client'
import type { StageKey } from './meta'

/** What's filled in already when adding from a lane or a record's page. */
export type DealDefaults = { stage?: StageKey; organization_id?: number | null; contact_id?: number | null }
export type ContactDefaults = { organization_id?: number | null }

type DealFormApi = {
  /** Opens the add form, with a stage or links already chosen. */
  openNew: (defaults?: DealDefaults) => void
  openEdit: (deal: Schemas['Deal']) => void
}

type ContactFormApi = { openNew: (defaults?: ContactDefaults) => void }

export const DealFormContext = createContext<DealFormApi | null>(null)
export const ContactFormContext = createContext<ContactFormApi | null>(null)

/** The deal form, which the top bar's "영업 기회 추가", the tables, the board's
 * lanes and the record pages all open. */
export function useDealForm(): DealFormApi {
  const context = useContext(DealFormContext)
  if (!context) throw new Error('useDealForm needs DealFormProvider')
  return context
}

/** The contact form, which an organization's page opens to add a contact to it. */
export function useContactForm(): ContactFormApi {
  const context = useContext(ContactFormContext)
  if (!context) throw new Error('useContactForm needs ContactFormProvider')
  return context
}
