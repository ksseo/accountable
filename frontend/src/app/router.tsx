import { createBrowserRouter } from 'react-router'
import { ContactPage } from '../crm/contacts/ContactPage'
import { ContactsPage } from '../crm/contacts/ContactsPage'
import { DashboardPage } from '../crm/dashboard/DashboardPage'
import { DealPage } from '../crm/deals/DealPage'
import { DealsPage } from '../crm/deals/DealsPage'
import { OrganizationPage } from '../crm/organizations/OrganizationPage'
import { OrganizationsPage } from '../crm/organizations/OrganizationsPage'
import { PipelinePage } from '../crm/pipeline/PipelinePage'
import { NotFoundPage } from './NotFoundPage'
import { Layout } from './Layout'

// The eight pages. A later area adds its own routes here.
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/organizations', element: <OrganizationsPage /> },
      { path: '/organizations/:id', element: <OrganizationPage /> },
      { path: '/contacts', element: <ContactsPage /> },
      { path: '/contacts/:id', element: <ContactPage /> },
      { path: '/deals', element: <DealsPage /> },
      { path: '/deals/:id', element: <DealPage /> },
      { path: '/pipeline', element: <PipelinePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
