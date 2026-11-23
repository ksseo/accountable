import { describe, expect, it } from 'vitest'
import { dropped, movedByMenu, movedTo, pickedUp, putBack } from './announcements'

const spot = { stageLabel: '제안', position: 3, total: 9 }

describe('board announcements (PIPE-9)', () => {
  it('says what was picked up, where it is and which keys to use', () => {
    expect(pickedUp('2027 포장재 공급', spot)).toBe(
      '‘2027 포장재 공급’을 들었어요. 지금 제안 단계, 9건 중 3번째예요. 화살표 키로 옮기고 스페이스 키로 놓으세요. Esc 키를 누르면 제자리로 돌아가요.',
    )
  })

  it('says each new place', () => {
    expect(movedTo({ stageLabel: '협상', position: 1, total: 4 })).toBe('협상 단계, 4건 중 1번째.')
  })

  it('says where the card was dropped', () => {
    expect(dropped('물류센터 자동화 부품', spot)).toBe('‘물류센터 자동화 부품’을 제안 단계, 9건 중 3번째 자리에 놓았어요.')
  })

  it('says the card went back to its place', () => {
    expect(putBack('물류센터 자동화 부품', spot)).toBe(
      '옮기지 않았어요. ‘물류센터 자동화 부품’은 제안 단계, 9건 중 3번째 자리 그대로예요.',
    )
  })

  it('picks the particle from the last letter, and gives both after a Latin name', () => {
    expect(dropped('반도체 장비 부품 납품', spot)).toMatch(/^‘반도체 장비 부품 납품’을 /)
    expect(dropped('화장품 용기 2차 금형', spot)).toMatch(/^‘화장품 용기 2차 금형’을 /)
    expect(dropped('냉동식품 트레이', spot)).toMatch(/^‘냉동식품 트레이’를 /)
    expect(dropped('Label printer retrofit', spot)).toMatch(/^‘Label printer retrofit’을\(를\) /)
    expect(putBack('냉동식품 트레이', spot)).toContain('‘냉동식품 트레이’는 ')
  })

  it('says a move from the card menu', () => {
    expect(movedByMenu('2027 포장재 공급', '협상')).toBe('‘2027 포장재 공급’을 협상 단계로 옮겼어요.')
  })
})
