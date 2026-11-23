import type { ReactNode } from 'react'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import styles from './Button.module.css'

type Variant = 'dark' | 'white' | 'page' | 'danger' | 'ghost'

export type ButtonProps = Omit<AriaButtonProps, 'className' | 'children'> & {
  variant?: Variant
  size?: 'md' | 'sm'
  className?: string
  children: ReactNode
}

/** A React Aria button in the brand's styles. Icons go beside a text label (LOOK-10). */
export function Button({ variant = 'white', size = 'md', className, children, ...props }: ButtonProps) {
  const classes = [styles.button, styles[variant], size === 'sm' ? styles.sm : '', className ?? '']
  return (
    <AriaButton {...props} data-variant={variant} className={classes.filter(Boolean).join(' ')}>
      {children}
    </AriaButton>
  )
}
