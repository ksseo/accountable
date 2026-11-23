import type { ReactNode, Ref } from 'react'
import { FieldError, Input, Label, Text, TextArea, TextField } from 'react-aria-components'
import styles from './Field.module.css'

/** A field's label, with "(필수)" for required fields (FORM-2). */
export function FieldLabel({ children, isRequired }: { children: ReactNode; isRequired?: boolean }) {
  return (
    <Label className={styles.label}>
      {children}
      {isRequired ? <> <span className={styles.required}>(필수)</span></> : null}
    </Label>
  )
}

export type FieldProps = {
  label: string
  isRequired?: boolean
  /** The Korean message shown under the field. */
  error?: string
  description?: string
}

type TextInputProps = FieldProps & {
  name: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>
  type?: 'text' | 'email' | 'tel' | 'url'
  inputMode?: 'text' | 'numeric' | 'email' | 'tel' | 'url'
  autoComplete?: string
  placeholder?: string
  multiline?: boolean
  /** Text after the input, such as "%". */
  suffix?: string
  className?: string
}

/** A labelled text input or text area, with its message tied to it (A11Y-3). */
export function TextInput({
  label,
  isRequired,
  error,
  description,
  name,
  value,
  onChange,
  onBlur,
  inputRef,
  type = 'text',
  inputMode,
  autoComplete = 'off',
  placeholder,
  multiline,
  suffix,
  className,
}: TextInputProps) {
  return (
    <TextField
      className={[styles.field, className].filter(Boolean).join(' ')}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      validationBehavior="aria"
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
    >
      <FieldLabel isRequired={isRequired}>{label}</FieldLabel>
      {multiline ? (
        <TextArea ref={inputRef} className={`${styles.input} ${styles.textarea}`} placeholder={placeholder} rows={4} />
      ) : (
        <div className={styles.inputRow}>
          <Input ref={inputRef} className={styles.input} placeholder={placeholder} />
          {suffix ? <span className={styles.suffix}>{suffix}</span> : null}
        </div>
      )}
      {description ? (
        <Text slot="description" className={styles.description}>
          {description}
        </Text>
      ) : null}
      <FieldError className={styles.error}>{error}</FieldError>
    </TextField>
  )
}

/** Two or more fields side by side. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>
}

/** The fields of a form, one under another. */
export function FieldStack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>
}
