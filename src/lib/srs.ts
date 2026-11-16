import { addDays } from './dates'
import type { CardState } from './types'

/** 第 1–6 级箱子的复习间隔（天） */
export const INTERVALS = [1, 2, 4, 7, 15, 30] as const
export const MAX_BOX = INTERVALS.length
export const REVIEW_LIMIT = 40

export function newCard(wordId: number): CardState {
  return { wordId, box: 0, dueDate: '', lapses: 0, known: false }
}

/**
 * 答对升一级，答错回到第一级。
 * 标为「已掌握」的词只在一个月后抽查一次：抽查答对后不再安排，答错则回到正常流程。
 */
export function applyAnswer(card: CardState, correct: boolean, today: string): CardState {
  if (!correct) {
    return { ...card, box: 1, dueDate: addDays(today, INTERVALS[0]), lapses: card.lapses + 1, known: false }
  }
  if (card.known) return { ...card, box: MAX_BOX, dueDate: '' }
  const box = Math.min(card.box + 1, MAX_BOX)
  return { ...card, box, dueDate: addDays(today, INTERVALS[box - 1]) }
}

/** 批量标为「已掌握」：一个月后抽查一次 */
export function markKnown(card: CardState, today: string): CardState {
  return { ...card, box: MAX_BOX, known: true, dueDate: addDays(today, 30) }
}

export function unmarkKnown(card: CardState): CardState {
  return { ...card, box: 0, known: false, dueDate: '' }
}

export function isDue(card: CardState, today: string): boolean {
  return card.box > 0 && card.dueDate !== '' && card.dueDate <= today
}

export interface SessionInput {
  cards: CardState[]
  /** 每个词所属周次，用来决定哪些新词可以学 */
  wordWeeks: Map<number, number>
  today: string
  week: number
  newLimit: number
  /** 今天已经学过的新词数、已经复习过的词数（同一天多次练习时扣除） */
  newDoneToday?: number
  reviewsDoneToday?: number
  reviewLimit?: number
}

/**
 * 选出本次练习的词：到期词按到期日从早到晚取，最多 reviewLimit 个，
 * 多出的自然顺延；新词只取当前周次及以前的未学词。
 */
export function selectSession(input: SessionInput): { reviewIds: number[]; newIds: number[] } {
  const { cards, wordWeeks, today, week, newLimit } = input
  const reviewRoom = Math.max(0, (input.reviewLimit ?? REVIEW_LIMIT) - (input.reviewsDoneToday ?? 0))
  const newRoom = Math.max(0, newLimit - (input.newDoneToday ?? 0))

  const reviewIds = cards
    .filter((c) => wordWeeks.has(c.wordId) && isDue(c, today))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.wordId - b.wordId))
    .slice(0, reviewRoom)
    .map((c) => c.wordId)

  const byId = new Map(cards.map((c) => [c.wordId, c]))
  const newIds = [...wordWeeks.entries()]
    .filter(([id, w]) => w <= week && (byId.get(id)?.box ?? 0) === 0 && !byId.get(id)?.known)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .slice(0, newRoom)
    .map(([id]) => id)

  return { reviewIds, newIds }
}
