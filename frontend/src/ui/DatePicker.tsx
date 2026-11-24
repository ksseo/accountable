import { parseDate } from '@internationalized/date'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker as AriaDatePicker,
  DateSegment,
  Dialog,
  FieldError,
  Group,
  Heading,
  Popover,
} from 'react-aria-components'
import { FieldLabel, type FieldProps } from './Field'
import fieldStyles from './Field.module.css'
import styles from './DatePicker.module.css'

type Props = FieldProps & {
  name: string
  /** YYYY-MM-DD, or null for no date. */
  value: string | null
  onChange: (value: string | null) => void
  onBlur?: () => void
  /** Gets an object whose focus() moves to the first part of the date, for focusing a wrong field. */
  focusRef?: (target: { focus: () => void } | null) => void
}

/** React Aria's date picker. In the ko-KR locale it shows "2026. 11. 23."
 * whatever language the browser uses (FORM-6). */
export function DatePicker({ label, isRequired, error, name, value, onChange, onBlur, focusRef }: Props) {
  return (
    <AriaDatePicker
      className={fieldStyles.field}
      name={name}
      value={value ? parseDate(value) : null}
      onChange={(date) => onChange(date ? date.toString() : null)}
      onBlur={onBlur}
      isInvalid={Boolean(error)}
      isRequired={isRequired}
      validationBehavior="aria"
      granularity="day"
    >
      <FieldLabel isRequired={isRequired}>{label}</FieldLabel>
      <Group
        className={`${fieldStyles.input} ${styles.group}`}
        ref={(element) =>
          focusRef?.(
            element
              ? { focus: () => element.querySelector<HTMLElement>('[role="spinbutton"]')?.focus() }
              : null,
          )
        }
      >
        <DateInput className={styles.input}>
          {(segment) => <DateSegment segment={segment} className={styles.segment} />}
        </DateInput>
        <Button className={styles.open} aria-label={`${label} 달력 열기`}>
          <CalendarDays size={18} aria-hidden="true" />
        </Button>
      </Group>
      <FieldError className={fieldStyles.error}>{error}</FieldError>
      <Popover className={styles.popover}>
        <Dialog className={styles.dialog} aria-label={`${label} 선택`}>
          <Calendar className={styles.calendar}>
            <header className={styles.head}>
              <Button slot="previous" className={styles.nav}>
                <ChevronLeft size={18} aria-hidden="true" />
              </Button>
              <Heading className={styles.month} />
              <Button slot="next" className={styles.nav}>
                <ChevronRight size={18} aria-hidden="true" />
              </Button>
            </header>
            <CalendarGrid className={styles.grid}>
              {(date) => <CalendarCell date={date} className={styles.cell} />}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  )
}
