import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '../../api/client'

export const PIPELINE_KEY = ['pipeline'] as const

export const usePipeline = () =>
  useQuery({ queryKey: PIPELINE_KEY, queryFn: () => unwrap(api.GET('/api/pipeline')) })
