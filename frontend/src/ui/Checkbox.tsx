import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Checkbox as AriaCheckbox } from 'react-aria-components'
import styles from './Checkbox.module.css'

type Props = {
  isSelected: boolean
  onChange: (isSelected: boolean) => void
  isDisabled?: boolean
  /** Shown beside the box. Without it, `aria-label` names the box. */
  children?: ReactNode
  'aria-label'?: string
}

/** A checkbox in the brand's style, such as marking a follow-up done. */
export function Checkbox({ isSelected, onChange, isDisabled, children, ...props }: Props) {
  return (
    <AriaCheckbox
      className={styles.checkbox}
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      aria-label={props['aria-label']}
    >
      <span className={styles.box} aria-hidden="true">
        <Check size={14} strokeWidth={3} />
      </span>
      {children}
    </AriaCheckbox>
  )
}
