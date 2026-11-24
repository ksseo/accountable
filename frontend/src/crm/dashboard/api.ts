import { useQuery } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '../../api/client'

export type Dashboard = Schemas['Dashboard']
export type BandStage = Schemas['BandStage']
export type MonthFigures = Schemas['MonthFigures']
export type FunnelStage = Schemas['FunnelStage']
export type FollowUp = Schemas['FollowUp']
export type RecentEntry = Schemas['RecentEntry']
export type DashboardFigures = Schemas['Figures']

/** ", 한빛정밀" after a contact's name. A deal's name stands alone, as in mockup 3, which keeps each row on one line. */
export const organizationOf = (record: FollowUp['record']): string | null =>
  record.kind === 'contact' && record.organization_name ? `, ${record.organization_name}` : null

/** Every figure on the dashboard, from one call, fetched again each time the
 * dashboard is shown (DASH-1). */
export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: () => unwrap(api.GET('/api/dashboard')),
    refetchOnMount: 'always',
  })
