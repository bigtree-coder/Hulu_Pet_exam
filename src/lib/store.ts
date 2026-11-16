import { addDays, weekStart, weekday } from './dates'
import { db as defaultDb, DEFAULT_SETTINGS, type PetDB } from './db'
import { defaultMinimal, planFor } from './plan'
import { applyAnswer, markKnown, newCard, unmarkKnown } from './srs'
import type { CardState, DayMeta, QType, Settings, TaskType, Word } from './types'

export async function getSettings(db: PetDB = defaultDb): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('main')) }
}

export async function saveSettings(patch: Partial<Settings>, db: PetDB = defaultDb): Promise<void> {
  await db.settings.put({ ...(await getSettings(db)), ...patch, key: 'main' })
}

/** 按单词（不分大小写）合并导入：已有的词更新内容，学习进度保留 */
export async function importWords(words: Word[], db: PetDB = defaultDb): Promise<{ added: number; updated: number }> {
  let added = 0
  let updated = 0
  await db.transaction('rw', db.words, async () => {
    const existing = new Map((await db.words.toArray()).map((w) => [w.word.toLowerCase(), w]))
    for (const w of words) {
      const old = existing.get(w.word.toLowerCase())
      if (old) { await db.words.update(old.id!, { ...w, id: old.id }); updated++ }
      else { await db.words.add({ ...w }); added++ }
    }
  })
  return { added, updated }
}

export async function getCard(wordId: number, db: PetDB = defaultDb): Promise<CardState> {
  return (await db.cards.get(wordId)) ?? newCard(wordId)
}

/** 记录一次作答并更新箱子，返回更新后的卡片 */
export async function recordAnswer(
  wordId: number, qtype: QType, correct: boolean, today: string, db: PetDB = defaultDb,
): Promise<{ before: CardState; after: CardState }> {
  return db.transaction('rw', db.cards, db.logs, async () => {
    const before = await getCard(wordId, db)
    const after = applyAnswer(before, correct, today)
    await db.cards.put(after)
    await db.logs.add({ wordId, time: Date.now(), date: today, qtype, correct, boxBefore: before.box, boxAfter: after.box })
    return { before, after }
  })
}

export async function setKnown(wordIds: number[], known: boolean, today: string, db: PetDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.cards, async () => {
    for (const id of wordIds) {
      const card = await getCard(id, db)
      if (known && !card.known) await db.cards.put(markKnown(card, today))
      if (!known && card.known) await db.cards.put(unmarkKnown(card))
    }
  })
}

export async function deleteWords(wordIds: number[], db: PetDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.words, db.cards, async () => {
    await db.words.bulkDelete(wordIds)
    await db.cards.bulkDelete(wordIds)
  })
}

export function isMinimal(date: string, meta: DayMeta | undefined): boolean {
  return meta?.minimal ?? defaultMinimal(date)
}

export const STICKERS = ['🦊', '🐼', '🦄', '🐳', '🦉', '🐢', '🦋', '🐙', '🦁', '🐧', '🦕', '🐝', '🌈', '🚀', '🍉', '🎈', '⭐', '🌻', '🍩', '🎨', '🪁', '🏰', '🛸', '🧁']

/** 把某项任务标为完成/未完成，并在当天全部完成时发一枚贴纸 */
export async function setTaskDone(
  date: string, type: TaskType, done: boolean, minutes = 0, db: PetDB = defaultDb,
): Promise<void> {
  await db.transaction('rw', db.tasks, db.days, db.settings, async () => {
    const meta = await db.days.get(date)
    const minimal = isMinimal(date, meta)
    const id = `${date}:${type}`
    const old = await db.tasks.get(id)
    await db.tasks.put({ id, date, type, done, minutes: done ? Math.max(minutes, old?.minutes ?? 0) : 0, minimal })
    await refreshSticker(date, db)
  })
}

export async function refreshSticker(date: string, db: PetDB = defaultDb): Promise<void> {
  const { startDate } = await getSettings(db)
  const meta = (await db.days.get(date)) ?? { date }
  const plan = planFor(date, startDate, isMinimal(date, meta))
  const done = new Set((await db.tasks.where('date').equals(date).toArray()).filter((t) => t.done).map((t) => t.type))
  const complete = plan.tasks.length > 0 && plan.tasks.every((t) => done.has(t.type))
  if (complete && !meta.sticker) {
    const count = await db.days.filter((d) => !!d.sticker).count()
    await db.days.put({ ...meta, sticker: STICKERS[count % STICKERS.length] })
  }
}

export async function setMinimal(date: string, minimal: boolean, db: PetDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.tasks, db.days, db.settings, async () => {
    await db.days.put({ ...((await db.days.get(date)) ?? { date }), minimal })
    await refreshSticker(date, db)
  })
}

export const REST_CARDS_PER_WEEK = 2

export async function restCardsLeft(date: string, db: PetDB = defaultDb): Promise<number> {
  const from = weekStart(date)
  const used = await db.days.where('date').between(from, addDays(from, 6), true, true).filter((d) => !!d.restCard).count()
  return Math.max(0, REST_CARDS_PER_WEEK - used)
}

export async function spendRestCard(date: string, db: PetDB = defaultDb): Promise<boolean> {
  return db.transaction('rw', db.days, async () => {
    const meta = (await db.days.get(date)) ?? { date }
    if (meta.restCard || meta.sticker) return false
    if ((await restCardsLeft(date, db)) <= 0) return false
    await db.days.put({ ...meta, restCard: true })
    return true
  })
}

/** 连续天数：完成日计数，休息卡和周日不计数也不断签；今天还没做完不算断 */
export function streak(days: DayMeta[], today: string): number {
  const byDate = new Map(days.map((d) => [d.date, d]))
  let n = 0
  for (let i = 0, d = today; i < 400; i++, d = addDays(d, -1)) {
    const m = byDate.get(d)
    if (m?.sticker) n++
    else if (m?.restCard || weekday(d) === 0 || i === 0) continue
    else break
  }
  return n
}
