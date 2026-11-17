import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { parseWordCsv } from './csv'
import { addDays, weekday, weekStart } from './dates'
import { PetDB } from './db'
import { planFor, weekOf, newWordLimit } from './plan'
import { buildQuestion, checkSpelling, makeCloze, pickType } from './quiz'
import { addListeningAudios, audioTitle, audiosForWeek, importWords, isAudioFile, recordAnswer, restCardsLeft, setMinimal, setTaskDone, streak, spendRestCard } from './store'
import type { Word } from './types'
import { readFileSync } from 'node:fs'

const START = '2026-11-16'
const w = (word: string, over: Partial<Word> = {}): Word => ({
  word, pos: 'n', meaningZh: `${word}的意思`, exampleEn: `I like the ${word} very much.`, topic: 't', week: 1, needSpelling: false, ...over,
})

describe('CSV 导入', () => {
  it('示例词表正好 20 个词，且每个例句都能出填空题', () => {
    const { words, errors } = parseWordCsv(readFileSync('public/sample-words.csv', 'utf8'))
    expect(errors).toEqual([])
    expect(words).toHaveLength(20)
    for (const x of words) expect(makeCloze(x.exampleEn, x.word), x.word).not.toBeNull()
  })

  it('12 周词表：384 个词，每周够用，每个例句都能出填空题', () => {
    const { words, errors } = parseWordCsv(readFileSync('public/pet-words.csv', 'utf8'))
    expect(errors).toEqual([])
    expect(words).toHaveLength(384)
    for (let wk = 1; wk <= 12; wk++) {
      // 第 1–8 周每天 8 个 × 4 天，第 9–12 周每天 5 个 × 4 天
      expect(words.filter((x) => x.week === wk).length, `week ${wk}`).toBeGreaterThanOrEqual(wk <= 8 ? 32 : 20)
    }
    for (const x of words) expect(makeCloze(x.exampleEn, x.word), x.word).not.toBeNull()
    expect(new Set(words.map((x) => x.meaningZh)).size).toBe(words.length)
  })

  it('支持引号里的逗号、BOM、CRLF，跳过坏行并说明原因', () => {
    const csv = '﻿word,pos,meaning_zh,example_en,topic,week,need_spelling\r\n' +
      'abroad,adv,在国外,"My cousin, Tom, studies abroad.",travel,4,1\r\n' +
      ',n,空,,,1,0\r\n' +
      'Abroad,adv,重复,,travel,4,0\r\n' +
      'bike,n,自行车,I ride a bike.,travel,99,0\r\n'
    const { words, errors } = parseWordCsv(csv)
    expect(words).toHaveLength(2)
    expect(words[0]).toMatchObject({ word: 'abroad', exampleEn: 'My cousin, Tom, studies abroad.', week: 4, needSpelling: true })
    expect(words[1]).toMatchObject({ word: 'bike', week: 1 })
    expect(errors).toHaveLength(3)
  })
})

describe('出题', () => {
  const pool = ['apple', 'bread', 'cheese', 'water', 'juice'].map((x) => w(x))

  it('题型按熟练度递进', () => {
    const plain = pool[0]
    const spell = w('usually', { needSpelling: true })
    for (let i = 0; i < 20; i++) {
      expect(['listen', 'read']).toContain(pickType(plain, 1, true))
      expect(pickType(plain, 2, false)).toBe('read')
      expect(['zh2en', 'cloze']).toContain(pickType(plain, 3, true))
      expect(['zh2en', 'cloze']).toContain(pickType(spell, 4, true))
    }
    expect(pickType(spell, 5, true)).toBe('spell')
    expect(pickType(plain, 6, true)).toBe('cloze')
    expect(pickType(w('x', { exampleEn: 'No match here.' }), 6, true)).toBe('zh2en')
  })

  it('四选一：含正确答案，选项互不重复', () => {
    const q = buildQuestion(pool[0], 'read', pool)
    expect(q.options).toHaveLength(4)
    expect(q.options).toContain(pool[0])
    expect(new Set(q.options.map((o) => o.word)).size).toBe(4)
  })

  it('例句填空能处理词形变化和句首大写', () => {
    expect(makeCloze('He practises every day.', 'practise')).toBe('He _____ every day.')
    expect(makeCloze('Breakfast is ready.', 'breakfast')).toBe('_____ is ready.')
    expect(makeCloze('I like tea.', 'eat')).toBeNull()
  })

  it('拼写不区分大小写和首尾空格', () => {
    expect(checkSpelling('  Favourite ', 'favourite')).toBe(true)
    expect(checkSpelling('favorite', 'favourite')).toBe(false)
  })
})

describe('今日任务', () => {
  it('日期工具', () => {
    expect(weekday(START)).toBe(1)
    expect(weekStart('2026-11-22')).toBe(START)
    expect(weekStart(START)).toBe(START)
  })

  it('周次：从起始日算起，夹在 1–12 之间', () => {
    expect(weekOf('2026-11-01', START)).toBe(1)
    expect(weekOf('2026-11-22', START)).toBe(1)
    expect(weekOf('2026-11-23', START)).toBe(2)
    expect(weekOf('2027-02-07', START)).toBe(12)
    expect(weekOf('2027-03-01', START)).toBe(12)
  })

  it('按星期生成任务', () => {
    const types = (d: string, min = false) => planFor(d, START, min).tasks.map((t) => t.type)
    expect(types('2026-11-16')).toEqual(['words', 'listening', 'speaking'])
    expect(types('2026-11-17')).toEqual(['words', 'reading', 'writing'])
    expect(types('2026-11-18', true)).toEqual(['words'])
    expect(types('2026-11-21')).toEqual(['extensive', 'practice', 'chat'])
    expect(planFor('2026-11-22', START, false)).toMatchObject({ kind: 'rest', tasks: [] })
    // 第三阶段与最后一周
    expect(types('2027-01-11')).toEqual(['words', 'focus', 'speaking'])
    expect(types('2027-01-12')).toEqual(['words', 'focus', 'writing'])
    expect(types('2027-02-02')).toEqual(['words', 'speaking'])
  })

  it('新词量：最小任务日为 0，第三阶段不超过 5', () => {
    expect(newWordLimit(3, 8, false)).toBe(8)
    expect(newWordLimit(3, 8, true)).toBe(0)
    expect(newWordLimit(9, 8, false)).toBe(5)
    expect(newWordLimit(9, 3, false)).toBe(3)
  })
})

describe('数据库操作', () => {
  let n = 0
  const fresh = () => new PetDB(`test-${n++}`)

  it('重复导入只更新内容，保留学习进度', async () => {
    const db = fresh()
    expect(await importWords([w('apple'), w('bread')], db)).toEqual({ added: 2, updated: 0 })
    const id = (await db.words.where('word').equals('apple').first())!.id!
    await recordAnswer(id, 'read', true, START, db)
    expect(await importWords([w('Apple', { meaningZh: '苹果' }), w('milk')], db)).toEqual({ added: 1, updated: 1 })
    expect((await db.words.get(id))!.meaningZh).toBe('苹果')
    expect((await db.cards.get(id))!.box).toBe(1)
  })

  it('作答写入复习记录，箱子与到期日同步更新', async () => {
    const db = fresh()
    await importWords([w('apple')], db)
    const id = (await db.words.toCollection().first())!.id!
    await recordAnswer(id, 'read', true, START, db)
    await recordAnswer(id, 'listen', true, addDays(START, 1), db)
    await recordAnswer(id, 'zh2en', false, addDays(START, 3), db)
    expect(await db.cards.get(id)).toMatchObject({ box: 1, lapses: 1, dueDate: addDays(START, 4) })
    const logs = await db.logs.toArray()
    expect(logs.map((l) => [l.boxBefore, l.boxAfter, l.correct])).toEqual([[0, 1, true], [1, 2, true], [2, 1, false]])
  })

  it('当天任务全部完成才发贴纸；切到最小任务日后只需单词', async () => {
    const db = fresh()
    await setTaskDone(START, 'words', true, 9, db)
    expect((await db.days.get(START))?.sticker).toBeUndefined()
    await setMinimal(START, true, db)
    expect((await db.days.get(START))?.sticker).toBeTruthy()

    const tue = addDays(START, 1)
    await setTaskDone(tue, 'words', true, 10, db)
    await setTaskDone(tue, 'reading', true, 15, db)
    expect((await db.days.get(tue))?.sticker).toBeUndefined()
    await setTaskDone(tue, 'writing', true, 10, db)
    expect((await db.days.get(tue))?.sticker).toBeTruthy()
  })

  it('每周 2 张休息卡，用了不算断签', async () => {
    const db = fresh()
    const wed = addDays(START, 2)
    expect(await spendRestCard(wed, db)).toBe(true)
    expect(await spendRestCard(wed, db)).toBe(false)
    expect(await spendRestCard(addDays(START, 3), db)).toBe(true)
    expect(await restCardsLeft(START, db)).toBe(0)
    expect(await spendRestCard(addDays(START, 4), db)).toBe(false)
    expect(await restCardsLeft(addDays(START, 7), db)).toBe(2)
  })

  it('听力音频：识别文件类型，按周次保存，同一周按文件名自然排序', async () => {
    expect(isAudioFile({ name: 'Test1.MP3', type: '' })).toBe(true)
    expect(isAudioFile({ name: 'x.bin', type: 'audio/mpeg' })).toBe(true)
    expect(isAudioFile({ name: 'answers.pdf', type: 'application/pdf' })).toBe(false)
    expect(audioTitle('Test_1_Part_2.mp3')).toBe('Test 1 Part 2')

    const db = fresh()
    const f = (name: string, type = '') => new File([new Uint8Array([1, 2, 3])], name, { type })
    const r = await addListeningAudios([f('Track 10.mp3'), f('Track 2.m4a'), f('key.pdf', 'application/pdf')], 3, db)
    expect(r).toEqual({ added: 2, skipped: ['key.pdf'] })
    await addListeningAudios([f('Other.mp3')], 4, db)
    const week3 = await audiosForWeek(3, db)
    expect(week3.map((a) => a.name)).toEqual(['Track 2', 'Track 10'])
    expect(week3.map((a) => a.blob.type)).toEqual(['audio/mp4', 'audio/mpeg'])
    expect(week3[0].size).toBe(3)
    expect((await audiosForWeek(4, db)).map((a) => a.name)).toEqual(['Other'])
  })

  it('连续天数：休息卡和周日不断签，漏一天就断', () => {
    const s = (d: number) => ({ date: addDays(START, d), sticker: '⭐' })
    const days = [s(0), s(1), { date: addDays(START, 2), restCard: true }, s(3), s(4), s(5), /* 周日 */ s(7)]
    expect(streak(days, addDays(START, 7))).toBe(6)
    expect(streak(days, addDays(START, 8))).toBe(6) // 今天还没做，不算断
    expect(streak(days, addDays(START, 9))).toBe(0)
  })
})
