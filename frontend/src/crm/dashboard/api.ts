import { useQuery } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from '../../api/client'

export type Dashboard = Schemas['Dashboard']
export type BandStage = Schemas['BandStage']
export type MonthFigures = Schemas['MonthFigures']
export type FunnelStage = Schemas['FunnelStage']
export type FollowUp = Schemas['FollowUp']
export type RecentEntry = Schemas['RecentEntry']
export type DashboardFigures = Schemas['Figures']

/** Every figure on the dashboard, from one call, fetched again each time the
 * dashboard is shown (DASH-1). */
export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: () => unwrap(api.GET('/api/dashboard')),
    refetchOnMount: 'always',
  })
