import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // When the backend is down, the banner retries; the queries don't.
      retry: (count, error) => !(error instanceof ApiError && (error.offline || error.status === 404)) && count < 1,
      staleTime: 0,
    },
  },
})
