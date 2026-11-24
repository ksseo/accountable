import { ChevronDown } from 'lucide-react'
import { useMemo, useState, type Ref } from 'react'
import { Button, ComboBox, FieldError, Input, ListBox, ListBoxItem, Popover } from 'react-aria-components'
import { matches } from './DataTable/search'
import { FieldLabel, type FieldProps } from './Field'
import fieldStyles from './Field.module.css'
import selectStyles from './Select.module.css'
import styles from './Combobox.module.css'

export type ComboboxOption = { id: number; name: string; detail?: string | null }

// However many options there are, only this many matches are drawn at once;
// typing narrows them (FORM-3).
const SHOWN = 50

type Props = FieldProps & {
  name: string
  options: readonly ComboboxOption[]
  value: number | null
  onChange: (value: number | null) => void
  onBlur?: () => void
  inputRef?: Ref<HTMLInputElement>
  placeholder?: string
}

/** Picks one record by typing part of its name, by mouse or keyboard (FORM-3, A11Y-4).
 * Emptying the text clears the choice. */
export function Combobox({
  label,
  isRequired,
  error,
  name,
  options,
  value,
  onChange,
  onBlur,
  inputRef,
  placeholder,
}: Props) {
  const selected = options.find((option) => option.id === value) ?? null
  const [text, setText] = useState(selected?.name ?? '')

  // The value can change from outside, as when a deal's contact fills in the organization.
  const [lastSelected, setLastSelected] = useState(selected)
  if (selected?.id !== lastSelected?.id || selected?.name !== lastSelected?.name) {
    setLastSelected(selected)
    setText(selected?.name ?? '')
  }

  const shown = useMemo(() => {
    // While the text is the chosen name, every option shows, as in a list.
    const query = selected && text === selected.name ? '' : text
    const found = query ? options.filter((option) => matches([option.name, option.detail], query)) : options
    const first = found.slice(0, SHOWN)
    return selected && !first.includes(selected) ? [selected, ...first] : first
  }, [options, text, selected])

  return (
    <ComboBox
      className={fieldStyles.field}
      name={name}
      items={shown}
      inputValue={text}
      onInputChange={(next) => {
        setText(next)
        if (next === '' && value !== null) onChange(null)
      }}
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key === null) return
        const option = options.find((item) => item.id === Number(key))
        onChange(Number(key))
        if (option) setText(option.name)
      }}
      onBlur={onBlur}
      menuTrigger="focus"
      allowsEmptyCollection
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      validationBehavior="aria"
    >
      <FieldLabel isRequired={isRequired}>{label}</FieldLabel>
      <div className={styles.control}>
        <Input ref={inputRef} className={`${fieldStyles.input} ${styles.input}`} placeholder={placeholder} />
        <Button className={styles.toggle} aria-label={`${label} 목록 열기`}>
          <ChevronDown size={18} aria-hidden="true" />
        </Button>
      </div>
      <FieldError className={fieldStyles.error}>{error}</FieldError>
      <Popover className={selectStyles.popover}>
        <ListBox
          className={selectStyles.list}
          renderEmptyState={() => <p className={styles.none}>찾는 항목이 없어요</p>}
        >
          {(option: ComboboxOption) => (
            <ListBoxItem id={option.id} textValue={option.name} className={selectStyles.option}>
              <span>{option.name}</span>
              {option.detail ? <span className={selectStyles.detail}>{option.detail}</span> : null}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  )
}

type SuggestProps = FieldProps & {
  name: string
  suggestions: readonly string[]
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  inputRef?: Ref<HTMLInputElement>
}

/** Free text with suggestions from values already in use, such as industries. */
export function SuggestInput({
  label,
  isRequired,
  error,
  name,
  suggestions,
  value,
  onChange,
  onBlur,
  inputRef,
}: SuggestProps) {
  const shown = useMemo(
    () =>
      suggestions
        .filter((item) => item !== value && matches([item], value))
        .slice(0, SHOWN)
        .map((item) => ({ id: item, name: item })),
    [suggestions, value],
  )
  return (
    <ComboBox
      className={fieldStyles.field}
      name={name}
      items={shown}
      inputValue={value}
      onInputChange={onChange}
      onSelectionChange={(key) => key !== null && onChange(String(key))}
      onBlur={onBlur}
      allowsCustomValue
      menuTrigger="input"
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      validationBehavior="aria"
    >
      <FieldLabel isRequired={isRequired}>{label}</FieldLabel>
      <Input ref={inputRef} className={fieldStyles.input} />
      <FieldError className={fieldStyles.error}>{error}</FieldError>
      <Popover className={selectStyles.popover}>
        <ListBox className={selectStyles.list}>
          {(item: { id: string; name: string }) => (
            <ListBoxItem id={item.id} textValue={item.name} className={selectStyles.option}>
              {item.name}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  )
}
