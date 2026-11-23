import '@fontsource/noto-sans-kr/400.css'
import '@fontsource/noto-sans-kr/500.css'
import '@fontsource/noto-sans-kr/600.css'
import '@fontsource/noto-sans-kr/700.css'
import './styles/tokens.css'
import './styles/global.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from 'react-aria-components'
import { RouterProvider } from 'react-router/dom'
import { queryClient } from './api/queryClient'
import { router } from './app/router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale="ko-KR">
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)
