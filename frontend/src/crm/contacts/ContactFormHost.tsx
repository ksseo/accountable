import { useMemo, useState, type ReactNode } from 'react'
import { ContactFormContext, type ContactDefaults } from '../openForms'
import { ContactDialog } from './ContactDialog'

/** Lets pages of other features add a contact. */
export function ContactFormProvider({ children }: { children: ReactNode }) {
  const [defaults, setDefaults] = useState<ContactDefaults | null>(null)
  const value = useMemo(() => ({ openNew: (chosen: ContactDefaults = {}) => setDefaults(chosen) }), [])

  return (
    <ContactFormContext.Provider value={value}>
      {children}
      {defaults ? <ContactDialog target="new" defaults={defaults} onClose={() => setDefaults(null)} /> : null}
    </ContactFormContext.Provider>
  )
}
