import { fromDate, getLocalTimeZone, toCalendarDateTime, type CalendarDateTime } from '@internationalized/date'
import { DateField, DateInput, DateSegment, FieldError } from 'react-aria-components'
import { FieldLabel, type FieldProps } from './Field'
import fieldStyles from './Field.module.css'
import styles from './DatePicker.module.css'

type Props = FieldProps & {
  name: string
  /** A moment as an ISO string with its offset, or null. */
  value: string | null
  onChange: (value: string | null) => void
  onBlur?: () => void
  focusRef?: (target: { focus: () => void } | null) => void
}

const toLocal = (value: string): CalendarDateTime => toCalendarDateTime(fromDate(new Date(value), getLocalTimeZone()))

/** A date and a time to the minute, in the computer's time zone, shown the
 * Korean way: "2026. 11. 23. 오후 3:20" (FORM-6). */
export function DateTimeField({ label, isRequired, error, name, value, onChange, onBlur, focusRef }: Props) {
  return (
    <DateField
      className={fieldStyles.field}
      name={name}
      value={value ? toLocal(value) : null}
      onChange={(moment) => onChange(moment ? moment.toDate(getLocalTimeZone()).toISOString() : null)}
      onBlur={onBlur}
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      validationBehavior="aria"
      granularity="minute"
      hideTimeZone
    >
      <FieldLabel isRequired={isRequired}>{label}</FieldLabel>
      <DateInput
        className={`${fieldStyles.input} ${styles.dateTime}`}
        ref={(element) =>
          focusRef?.(
            element ? { focus: () => element.querySelector<HTMLElement>('[role="spinbutton"]')?.focus() } : null,
          )
        }
      >
        {(segment) => <DateSegment segment={segment} className={styles.segment} />}
      </DateInput>
      <FieldError className={fieldStyles.error}>{error}</FieldError>
    </DateField>
  )
}
