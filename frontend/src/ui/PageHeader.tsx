import { useEffect, type ReactNode } from 'react'
import styles from './PageHeader.module.css'

type Props = {
  title: string
  /** A one-line summary in plain words, such as "연락처 248명 · 고객 61명" (UI-2). */
  summary?: ReactNode
  actions?: ReactNode
}

/** The header row every page starts with: title, summary and actions (UI-2). */
export function PageHeader({ title, summary, actions }: Props) {
  useEffect(() => {
    document.title = `${title} · Accountable`
  }, [title])

  return (
    <div className={styles.head}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {summary ? <p className={styles.summary}>{summary}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  )
}
