import { MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components'
import { Button } from './Button'
import styles from './RowMenu.module.css'

export type RowMenuItem = { key: string; label: string; icon?: ReactNode; danger?: boolean }

type Props = {
  /** The menu button's accessible name, such as "한빛정밀 메뉴". */
  label: string
  items: RowMenuItem[]
  onAction: (key: string) => void
}

/** A row's or card's menu, reachable by keyboard (TBL-4, A11Y-4). */
export function RowMenu({ label, items, onAction }: Props) {
  return (
    <MenuTrigger>
      <Button variant="ghost" size="sm" aria-label={label} className={styles.trigger}>
        <MoreHorizontal size={18} aria-hidden="true" />
      </Button>
      <Popover className={styles.popover} placement="bottom end">
        <Menu className={styles.menu} onAction={(key) => onAction(String(key))}>
          {items.map((item) => (
            <MenuItem
              key={item.key}
              id={item.key}
              textValue={item.label}
              className={item.danger ? `${styles.item} ${styles.danger}` : styles.item}
            >
              {item.icon}
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
