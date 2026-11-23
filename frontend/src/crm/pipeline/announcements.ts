// What a screen reader hears while a card is moved by keyboard (PIPE-9).
// Places are counted from 1 for people: "신규 단계, 9건 중 3번째".

import { objectParticle, quoted, topicParticle } from '../../lib/korean'

export type Spot = { stageLabel: string; position: number; total: number }

const where = ({ stageLabel, position, total }: Spot) => `${stageLabel} 단계, ${total}건 중 ${position}번째`

export const BOARD_HELP =
  '스페이스 키로 카드를 들고 화살표 키로 옮긴 뒤 스페이스 키로 놓으세요. Esc 키를 누르면 제자리로 돌아가요. Enter 키를 누르면 영업 기회가 열려요.'

export function pickedUp(name: string, spot: Spot): string {
  return `${quoted(name, objectParticle)} 들었어요. 지금 ${where(spot)}예요. 화살표 키로 옮기고 스페이스 키로 놓으세요. Esc 키를 누르면 제자리로 돌아가요.`
}

export function movedTo(spot: Spot): string {
  return `${where(spot)}.`
}

export function dropped(name: string, spot: Spot): string {
  return `${quoted(name, objectParticle)} ${where(spot)} 자리에 놓았어요.`
}

export function putBack(name: string, spot: Spot): string {
  return `옮기지 않았어요. ${quoted(name, topicParticle)} ${where(spot)} 자리 그대로예요.`
}

/** "‘2027 포장재 공급’을 제안 단계로 옮겼어요." after a move from the card menu. */
export function movedByMenu(name: string, stageLabel: string): string {
  return `${quoted(name, objectParticle)} ${stageLabel} 단계로 옮겼어요.`
}

export const MOVE_FAILED = '이동하지 못했어요. 다시 시도해 주세요.'
