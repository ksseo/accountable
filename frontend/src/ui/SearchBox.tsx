import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input, Label, SearchField } from 'react-aria-components'
import { Button } from './Button'
import styles from './SearchBox.module.css'

type Props = {
  label: string
  placeholder?: string
  value: string
  /** Called as the text changes, but not while a Korean letter is still being typed (TBL-2). */
  onSearch: (value: string) => void
}

/** A search field that waits for each Korean letter to be finished. */
export function SearchBox({ label, placeholder, value, onSearch }: Props) {
  const [text, setText] = useState(value)
  const composing = useRef(false)

  // The address can change the search too, for example going back.
  useEffect(() => {
    if (!composing.current) setText(value)
  }, [value])

  return (
    <SearchField
      className={styles.field}
      value={text}
      onChange={(next) => {
        setText(next)
        if (!composing.current) onSearch(next)
      }}
      onClear={() => onSearch('')}
    >
      <Label className="sr-only">{label}</Label>
      <Search className={styles.icon} size={18} aria-hidden="true" />
      <Input
        className={styles.input}
        placeholder={placeholder}
        onCompositionStart={() => {
          composing.current = true
        }}
        onCompositionEnd={(event) => {
          composing.current = false
          const finished = event.currentTarget.value
          setText(finished)
          onSearch(finished)
        }}
      />
      {text ? (
        <Button variant="ghost" size="sm" aria-label="검색어 지우기" className={styles.clear}>
          <X size={16} aria-hidden="true" />
        </Button>
      ) : null}
    </SearchField>
  )
}
