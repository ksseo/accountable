import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { ToggleButton } from 'react-aria-components'
import { mode } from './mode'
import styles from './ModeToggle.module.css'

/** Switches between light and dark mode (UI-9). */
export function ModeToggle() {
  const isDark = useSyncExternalStore(mode.subscribe, mode.isDark)
  const Icon = isDark ? Sun : Moon
  return (
    <ToggleButton
      className={styles.toggle}
      aria-label="다크 모드"
      isSelected={isDark}
      onChange={mode.setDark}
    >
      <Icon size={18} aria-hidden="true" />
    </ToggleButton>
  )
}
