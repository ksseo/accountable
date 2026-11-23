// What the three record pages share: the 수정 and 삭제 buttons, the list of
// details, the figures and the short lists of linked records (REC-1 to REC-3).

import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../ui/Button'
import styles from './records.module.css'

export function RecordActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <Button onPress={onEdit}>
        <Pencil size={16} aria-hidden="true" />
        수정
      </Button>
      <Button variant="danger" onPress={onDelete}>
        <Trash2 size={16} aria-hidden="true" />
        삭제
      </Button>
    </>
  )
}

/** Label and value pairs. A missing value shows as "없음". */
export function Details({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className={styles.details}>
      {items.map((item) => (
        <div key={item.label} className={styles.detail}>
          <dt>{item.label}</dt>
          <dd>{item.value ?? <span className={styles.none}>없음</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Figures({ items }: { items: { label: string; value: ReactNode; note?: ReactNode }[] }) {
  return (
    <dl className={styles.figures}>
      {items.map((item) => (
        <div key={item.label} className={styles.figure}>
          <dt>{item.label}</dt>
          <dd>
            {item.value}
            {item.note ? <span className={styles.figureNote}>{item.note}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** The "추가" button in a linked list's heading. */
export function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button variant="ghost" size="sm" aria-label={label} onPress={onPress}>
      <Plus size={16} aria-hidden="true" />
      추가
    </Button>
  )
}

/** A short list of linked records, one row each. */
export function LinkedList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul className={styles.list} aria-label={label}>
      {children}
    </ul>
  )
}

export function LinkedRow({ main, meta, end }: { main: ReactNode; meta?: ReactNode; end?: ReactNode }) {
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>{main}</div>
        {meta ? <div className={styles.rowMeta}>{meta}</div> : null}
      </div>
      {end ? <div className={styles.rowEnd}>{end}</div> : null}
    </li>
  )
}

/** A website, opened in a new tab (REC-1). */
export function WebsiteLink({ url }: { url: string }) {
  return (
    <a className={styles.external} href={url} target="_blank" rel="noopener noreferrer">
      {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      <ExternalLink size={14} aria-hidden="true" />
      <span className="sr-only"> (새 탭에서 열림)</span>
    </a>
  )
}

/** A list of things joined by " · ", skipping empty ones. */
export function Joined({ parts }: { parts: ReactNode[] }) {
  const shown = parts.filter((part) => part !== null && part !== undefined && part !== false && part !== '')
  return (
    <>
      {shown.map((part, index) => (
        <span key={index}>
          {index > 0 ? ' · ' : null}
          {part}
        </span>
      ))}
    </>
  )
}
