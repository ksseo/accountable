import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { I18nProvider } from 'react-aria-components'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Meta } from '../crm/meta'

/** What /api/meta answers, for tests that don't call the backend. */
export const META: Meta = {
  today: '2026-11-23',
  stages: [
    { key: 'new', label: '신규', probability: 10, open: true },
    { key: 'qualified', label: '적격', probability: 25, open: true },
    { key: 'proposal', label: '제안', probability: 50, open: true },
    { key: 'negotiation', label: '협상', probability: 75, open: true },
    { key: 'won', label: '수주', probability: 100, open: false },
    { key: 'lost', label: '실주', probability: 0, open: false },
  ],
  statuses: [
    { key: 'lead', label: '리드' },
    { key: 'qualified', label: '적격' },
    { key: 'customer', label: '고객' },
  ],
  activity_kinds: [
    { key: 'note', label: '메모', automatic: false },
    { key: 'call', label: '통화', automatic: false },
    { key: 'email', label: '이메일', automatic: false },
    { key: 'stage_change', label: '단계 변경', automatic: true },
    { key: 'status_change', label: '상태 변경', automatic: true },
  ],
  industries: ['물류', '제조', '화장품'],
}

/** Renders inside the app's providers and a router at `path`. Meta is already
 * loaded, so nothing is fetched unless a test asks for it. */
export function renderWithApp(ui: ReactNode, { path = '/' }: { path?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(['meta'], META)
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [path] })
  const user = userEvent.setup()
  const result = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale="ko-KR">
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>,
  )
  return { ...result, user, router, queryClient }
}

/** The page address's query, as an object. */
export function searchOf(router: { state: { location: { search: string } } }): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(router.state.location.search))
}
