import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The backend is on this computer, so queries run with no internet too (APP-4).
      networkMode: 'always',
      // When the backend is down, the banner retries; the queries don't. Asking
      // again doesn't change a 4xx either.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
      staleTime: 0,
    },
    mutations: { networkMode: 'always' },
  },
})
