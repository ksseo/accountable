import { ChevronDown } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import {
  Button,
  FieldError,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
} from 'react-aria-components'
import { FieldLabel, type FieldProps } from './Field'
import fieldStyles from './Field.module.css'
import styles from './Select.module.css'

export type SelectOption<K extends string> = { key: K; label: string; render?: ReactNode }

type Props<K extends string> = FieldProps & {
  name: string
  options: SelectOption<K>[]
  value: K
  onChange: (value: K) => void
  onBlur?: () => void
  buttonRef?: Ref<HTMLButtonElement>
}

/** A labelled list to pick one from, such as a stage or a status (A11Y-4). */
export function Select<K extends string>({
  label,
  isRequired,
  error,
  name,
  options,
  value,
  onChange,
  onBlur,
  buttonRef,
}: Props<K>) {
  return (
    <AriaSelect
      className={fieldStyles.field}
      name={name}
      selectedKey={value}
      onSelectionChange={(key) => key !== null && onChange(String(key) as K)}
      onBlur={onBlur}
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      validationBehavior="aria"
    >
      <FieldLabel isRequired={isRequired}>{label}</FieldLabel>
      <Button ref={buttonRef} className={`${fieldStyles.input} ${styles.button}`}>
        <SelectValue className={styles.value} />
        <ChevronDown size={18} aria-hidden="true" />
      </Button>
      <FieldError className={fieldStyles.error}>{error}</FieldError>
      <Popover className={styles.popover}>
        <ListBox className={styles.list}>
          {options.map((option) => (
            <ListBoxItem key={option.key} id={option.key} textValue={option.label} className={styles.option}>
              {option.render ?? option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}
