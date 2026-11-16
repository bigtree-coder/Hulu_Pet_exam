import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { applyAnswer, INTERVALS, isDue, markKnown, newCard, selectSession } from './srs'
import type { CardState } from './types'

const D = '2026-11-16'

describe('六级箱子调度', () => {
  it('连续答对：间隔依次为 1、2、4、7、15、30 天', () => {
    let card = newCard(1)
    let today = D
    const gaps: number[] = []
    for (let i = 0; i < 6; i++) {
      card = applyAnswer(card, true, today)
      expect(card.box).toBe(i + 1)
      gaps.push(INTERVALS[i])
      expect(card.dueDate).toBe(addDays(today, INTERVALS[i]))
      today = card.dueDate
    }
    expect(gaps).toEqual([1, 2, 4, 7, 15, 30])
  })

  it('第 6 级答对后留在第 6 级，30 天后再见', () => {
    const card = applyAnswer({ wordId: 1, box: 6, dueDate: D, lapses: 0, known: false }, true, D)
    expect(card.box).toBe(6)
    expect(card.dueDate).toBe(addDays(D, 30))
  })

  it('答错回到第 1 级，明天再来，lapses 加一', () => {
    const card = applyAnswer({ wordId: 1, box: 4, dueDate: D, lapses: 1, known: false }, false, D)
    expect(card).toMatchObject({ box: 1, dueDate: addDays(D, 1), lapses: 2 })
  })

  it('新词第一次答错也进第 1 级', () => {
    expect(applyAnswer(newCard(1), false, D)).toMatchObject({ box: 1, dueDate: addDays(D, 1), lapses: 1 })
  })

  it('跨月、跨年的到期日正确', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-02-27', 2)).toBe('2027-03-01')
  })

  it('到期判断：只有学过且到期日不晚于今天才算', () => {
    expect(isDue(newCard(1), D)).toBe(false)
    expect(isDue({ wordId: 1, box: 2, dueDate: D, lapses: 0, known: false }, D)).toBe(true)
    expect(isDue({ wordId: 1, box: 2, dueDate: addDays(D, -3), lapses: 0, known: false }, D)).toBe(true)
    expect(isDue({ wordId: 1, box: 2, dueDate: addDays(D, 1), lapses: 0, known: false }, D)).toBe(false)
  })
})

describe('已掌握的词', () => {
  it('一个月后抽查一次，答对后不再安排', () => {
    const known = markKnown(newCard(1), D)
    expect(known).toMatchObject({ known: true, dueDate: addDays(D, 30) })
    expect(isDue(known, addDays(D, 29))).toBe(false)
    expect(isDue(known, addDays(D, 30))).toBe(true)
    const after = applyAnswer(known, true, addDays(D, 30))
    expect(after.dueDate).toBe('')
    expect(isDue(after, addDays(D, 400))).toBe(false)
  })

  it('抽查答错则回到正常学习流程', () => {
    const after = applyAnswer(markKnown(newCard(1), D), false, addDays(D, 30))
    expect(after).toMatchObject({ known: false, box: 1, dueDate: addDays(D, 31) })
  })
})

describe('每日选词', () => {
  const due = (id: number, dueDate: string): CardState => ({ wordId: id, box: 2, dueDate, lapses: 0, known: false })

  it('到期超过 40 个时只取最早到期的 40 个，其余顺延', () => {
    const cards = Array.from({ length: 55 }, (_, i) => due(i + 1, addDays(D, -(i % 5))))
    const wordWeeks = new Map(cards.map((c) => [c.wordId, 1]))
    const { reviewIds } = selectSession({ cards, wordWeeks, today: D, week: 1, newLimit: 0 })
    expect(reviewIds).toHaveLength(40)
    const picked = new Set(reviewIds)
    const latestPicked = cards.filter((c) => picked.has(c.wordId)).map((c) => c.dueDate).sort().at(-1)!
    const earliestLeft = cards.filter((c) => !picked.has(c.wordId)).map((c) => c.dueDate).sort()[0]
    expect(latestPicked <= earliestLeft).toBe(true)
    // 第二天，顺延的词仍然到期
    const next = selectSession({ cards: cards.filter((c) => !picked.has(c.wordId)), wordWeeks, today: addDays(D, 1), week: 1, newLimit: 0 })
    expect(next.reviewIds).toHaveLength(15)
  })

  it('新词只取当前周次及以前的未学词，按周次顺序，不超过每日上限', () => {
    const wordWeeks = new Map<number, number>()
    for (let i = 1; i <= 12; i++) wordWeeks.set(i, 1)
    for (let i = 13; i <= 20; i++) wordWeeks.set(i, 2)
    const cards = [due(1, addDays(D, 5)), markKnown(newCard(2), D)]
    const r = selectSession({ cards, wordWeeks, today: D, week: 1, newLimit: 8 })
    expect(r.newIds).toEqual([3, 4, 5, 6, 7, 8, 9, 10])
    const r2 = selectSession({ cards, wordWeeks, today: D, week: 2, newLimit: 20 })
    expect(r2.newIds).toHaveLength(18)
    expect(r2.newIds.slice(-8)).toEqual([13, 14, 15, 16, 17, 18, 19, 20])
  })

  it('同一天再次练习时扣除已学的新词；最小任务日不学新词', () => {
    const wordWeeks = new Map(Array.from({ length: 20 }, (_, i) => [i + 1, 1] as [number, number]))
    expect(selectSession({ cards: [], wordWeeks, today: D, week: 1, newLimit: 8, newDoneToday: 5 }).newIds).toHaveLength(3)
    expect(selectSession({ cards: [], wordWeeks, today: D, week: 1, newLimit: 8, newDoneToday: 8 }).newIds).toHaveLength(0)
    expect(selectSession({ cards: [], wordWeeks, today: D, week: 1, newLimit: 0 }).newIds).toHaveLength(0)
  })

  it('已删除的词不会被选中', () => {
    const r = selectSession({ cards: [due(99, D)], wordWeeks: new Map(), today: D, week: 1, newLimit: 8 })
    expect(r.reviewIds).toEqual([])
  })
})
