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

type Props = {
  kind: RecordKind
  id: number
  children: ReactNode
  /** In the weight of the text around it, for a name that isn't the row's main one. */
  quiet?: boolean
  /** -1 where something around it already takes the keyboard to the same page. */
  tabIndex?: number
}

/** A record's name, linking to its page. Every record name shown anywhere is one (UI-7). */
export function RecordLink({ kind, id, children, quiet = false, tabIndex }: Props) {
  return (
    // Not draggable by itself: on the board, dragging a name drags its card.
    <Link
      className={quiet ? `${styles.link} ${styles.quiet}` : styles.link}
      to={recordPath(kind, id)}
      tabIndex={tabIndex}
      draggable={false}
    >
      {children}
    </Link>
  )
}
