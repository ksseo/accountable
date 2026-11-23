import type { ReactNode } from 'react'
import { Link } from 'react-router'
import styles from './RecordLink.module.css'

export type RecordKind = 'organization' | 'contact' | 'deal'

const PATHS: Record<RecordKind, string> = {
  organization: '/organizations',
  contact: '/contacts',
  deal: '/deals',
}

export const recordPath = (kind: RecordKind, id: number) => `${PATHS[kind]}/${id}`

/** A record's name, linking to its page. Every record name shown anywhere is one (UI-7). */
export function RecordLink({ kind, id, children }: { kind: RecordKind; id: number; children: ReactNode }) {
  return (
    <Link className={styles.link} to={recordPath(kind, id)}>
      {children}
    </Link>
  )
}
