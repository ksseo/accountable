import type { Ref } from 'react'
import { formatMoney, parseMoney } from '../lib/money'
import { TextInput, type FieldProps } from './Field'

type Props = FieldProps & {
  name: string
  /** The text as typed; the form reads it with parseMoney. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>
}

/** Takes "12500", "12,500" or "$12,500" and shows "$12,500" once it's left (FORM-5). */
export function MoneyField({ value, onChange, onBlur, ...props }: Props) {
  return (
    <TextInput
      {...props}
      value={value}
      onChange={onChange}
      inputMode="numeric"
      placeholder="$0"
      onBlur={() => {
        const amount = parseMoney(value)
        if (amount !== null) onChange(formatMoney(amount))
        onBlur?.()
      }}
    />
  )
}
