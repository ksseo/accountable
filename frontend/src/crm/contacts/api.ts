import { useQuery } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '../../api/client'

export type Contact = Schemas['Contact']
export type ContactDetail = Schemas['ContactDetail']
export type ContactIn = Schemas['ContactIn']
export type ContactImpact = Schemas['ContactImpact']

export const useContacts = () => useQuery({ queryKey: ['contacts'], queryFn: () => unwrap(api.GET('/api/contacts')) })

export const useContact = (id: number) =>
  useQuery({
    queryKey: ['contacts', id],
    queryFn: () => unwrap(api.GET('/api/contacts/{contact_id}', { params: { path: { contact_id: id } } })),
  })

export function saveContact(id: number | null, body: ContactIn): Promise<Contact> {
  if (id === null) return unwrap(api.POST('/api/contacts', { body }))
  return unwrap(api.PATCH('/api/contacts/{contact_id}', { params: { path: { contact_id: id } }, body }))
}

export const contactImpact = (id: number) =>
  unwrap(api.GET('/api/contacts/{contact_id}/delete-impact', { params: { path: { contact_id: id } } }))

export const deleteContact = (id: number) =>
  unwrap(api.DELETE('/api/contacts/{contact_id}', { params: { path: { contact_id: id } } }))
