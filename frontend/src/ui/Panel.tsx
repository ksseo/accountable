import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Panel.module.css'

type Props = HTMLAttributes<HTMLElement> & {
  title?: ReactNode
  /** Text on the right of the panel's heading. */
  aside?: ReactNode
  /** The heading level for the title, h2 by default. */
  headingLevel?: 2 | 3
  children: ReactNode
}

/** A rounded panel with no outline (UI-3, LOOK-6). */
export function Panel({ title, aside, headingLevel = 2, className, children, ...props }: Props) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <section {...props} className={[styles.panel, className].filter(Boolean).join(' ')}>
      {title || aside ? (
        <div className={styles.head}>
          {title ? <Heading className={styles.title}>{title}</Heading> : <span />}
          {aside ? <div className={styles.aside}>{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
