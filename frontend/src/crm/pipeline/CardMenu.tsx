import { ArrowDown, ArrowRightLeft, ArrowUp, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Menu, MenuItem, MenuTrigger, Popover, SubmenuTrigger } from 'react-aria-components'
import { Button } from '../../ui/Button'
import menuStyles from '../../ui/RowMenu.module.css'
import { STAGES, type StageKey } from '../meta'
import styles from './Board.module.css'

export type CardAction = { kind: 'stage'; stage: StageKey } | { kind: 'up' | 'down' | 'edit' | 'delete' }

type Props = {
  name: string
  stage: StageKey
  stageLabel: (stage: StageKey) => string
  canMoveUp: boolean
  canMoveDown: boolean
  onAction: (action: CardAction) => void
}

/** The card's menu, a second way to move a card for anyone who finds the drag
 * keys awkward (PIPE-9): 단계 이동, 위로, 아래로, 수정 and 삭제. */
export function CardMenu({ name, stage, stageLabel, canMoveUp, canMoveDown, onAction }: Props) {
  const disabled = [!canMoveUp && 'up', !canMoveDown && 'down'].filter((key): key is string => Boolean(key))
  return (
    <MenuTrigger>
      <Button variant="ghost" size="sm" aria-label={`${name} 메뉴`} className={styles.menuButton}>
        <MoreHorizontal size={15} aria-hidden="true" />
      </Button>
      <Popover className={menuStyles.popover} placement="bottom end">
        <Menu
          className={menuStyles.menu}
          disabledKeys={disabled}
          onAction={(key) => onAction({ kind: key as 'up' | 'down' | 'edit' | 'delete' })}
        >
          <SubmenuTrigger>
            <MenuItem id="stage" textValue="단계 이동" className={menuStyles.item}>
              <ArrowRightLeft size={16} aria-hidden="true" />
              단계 이동
              <ChevronRight size={16} aria-hidden="true" className={styles.submenuMark} />
            </MenuItem>
            <Popover className={menuStyles.popover} placement="end top">
              <Menu
                className={menuStyles.menu}
                disabledKeys={[stage]}
                onAction={(key) => onAction({ kind: 'stage', stage: key as StageKey })}
              >
                {STAGES.map((key) => (
                  <MenuItem key={key} id={key} textValue={stageLabel(key)} className={menuStyles.item}>
                    {stageLabel(key)}
                  </MenuItem>
                ))}
              </Menu>
            </Popover>
          </SubmenuTrigger>
          <MenuItem id="up" textValue="위로" className={menuStyles.item}>
            <ArrowUp size={16} aria-hidden="true" />
            위로
          </MenuItem>
          <MenuItem id="down" textValue="아래로" className={menuStyles.item}>
            <ArrowDown size={16} aria-hidden="true" />
            아래로
          </MenuItem>
          <MenuItem id="edit" textValue="수정" className={menuStyles.item}>
            <Pencil size={16} aria-hidden="true" />
            수정
          </MenuItem>
          <MenuItem id="delete" textValue="삭제" className={`${menuStyles.item} ${menuStyles.danger}`}>
            <Trash2 size={16} aria-hidden="true" />
            삭제
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
