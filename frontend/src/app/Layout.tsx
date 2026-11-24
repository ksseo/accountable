import { Plus } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { ContactFormProvider } from '../crm/contacts/ContactFormHost'
import { DealFormProvider } from '../crm/deals/DealFormHost'
import { useDealForm } from '../crm/openForms'
import { Button } from '../ui/Button'
import { ConnectionBanner } from './ConnectionBanner'
import styles from './Layout.module.css'
import { Toasts } from './Toasts'

// The five sections, in the intent's order (UI-1). The only list of sections.
const SECTIONS = [
  { to: '/', label: '대시보드', end: true },
  { to: '/organizations', label: '거래처', end: false },
  { to: '/contacts', label: '연락처', end: false },
  { to: '/deals', label: '영업 기회', end: false },
  { to: '/pipeline', label: '파이프라인', end: false },
]

function BrandMark() {
  return (
    <svg width="34" height="14" viewBox="0 0 34 14" aria-hidden="true">
      <rect x="0" y="0" width="12" height="14" rx="4" fill="#06D6A0" />
      <rect x="14" y="0" width="9" height="14" rx="4" fill="#FFC145" />
      <rect x="25" y="0" width="5" height="14" rx="2.5" fill="#F78C6B" />
      <rect x="31.5" y="0" width="2.5" height="14" rx="1.25" fill="#118AB2" />
    </svg>
  )
}

/** The frame around every page: the top bar, the banner and the message area.
 * "영업 기회 추가" opens the deal form on any page. */
export function Layout() {
  return (
    <ContactFormProvider>
      <DealFormProvider>
        <Frame />
      </DealFormProvider>
    </ContactFormProvider>
  )
}

function Frame() {
  const dealForm = useDealForm()
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <Link className={styles.brand} to="/">
          <BrandMark />
          Accountable
        </Link>
        <nav className={styles.nav} aria-label="주 메뉴">
          {SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              end={section.end}
              className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.current}` : styles.navLink)}
            >
              {section.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.actions}>
          <Button variant="dark" onPress={() => dealForm.openNew()}>
            <Plus size={18} aria-hidden="true" />
            영업 기회 추가
          </Button>
        </div>
      </header>
      <ConnectionBanner />
      <main className={styles.main}>
        <Outlet />
      </main>
      <Toasts />
    </div>
  )
}
