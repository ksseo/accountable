import { useQuery } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '../../api/client'

export type Organization = Schemas['Organization']
export type OrganizationRow = Schemas['OrganizationRow']
export type OrganizationDetail = Schemas['OrganizationDetail']
export type OrganizationIn = Schemas['OrganizationIn']
export type OrganizationImpact = Schemas['OrganizationImpact']

export const useOrganizations = () =>
  useQuery({ queryKey: ['organizations'], queryFn: () => unwrap(api.GET('/api/organizations')) })

export const useOrganization = (id: number) =>
  useQuery({
    queryKey: ['organizations', id],
    queryFn: () =>
      unwrap(api.GET('/api/organizations/{organization_id}', { params: { path: { organization_id: id } } })),
  })

export function saveOrganization(id: number | null, body: OrganizationIn): Promise<Organization> {
  if (id === null) return unwrap(api.POST('/api/organizations', { body }))
  return unwrap(
    api.PATCH('/api/organizations/{organization_id}', { params: { path: { organization_id: id } }, body }),
  )
}

export const organizationImpact = (id: number) =>
  unwrap(
    api.GET('/api/organizations/{organization_id}/delete-impact', {
      params: { path: { organization_id: id } },
    }),
  )

export const deleteOrganization = (id: number) =>
  unwrap(api.DELETE('/api/organizations/{organization_id}', { params: { path: { organization_id: id } } }))
