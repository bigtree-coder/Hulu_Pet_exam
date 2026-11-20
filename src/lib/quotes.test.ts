import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { DAILY_QUOTES, getDailyQuote, quoteIndexForDate, type DailyQuote } from './quotes'

describe('每日激励语', () => {
  it('本地词库包含 24–30 条互不重复的双语鼓励语', () => {
    expect(DAILY_QUOTES.length).toBeGreaterThanOrEqual(24)
    expect(DAILY_QUOTES.length).toBeLessThanOrEqual(30)
    for (const q of DAILY_QUOTES) {
      expect(q.zh.trim().length).toBeGreaterThan(0)
      expect(q.en.trim().length).toBeGreaterThan(0)
    }
    expect(new Set(DAILY_QUOTES.map((q) => q.zh)).size).toBe(DAILY_QUOTES.length)
    expect(new Set(DAILY_QUOTES.map((q) => q.en)).size).toBe(DAILY_QUOTES.length)
  })

  it('同一天永远返回同一句（支持字符串和 Date）', () => {
    const a = getDailyQuote('2026-11-20')
    const b = getDailyQuote('2026-11-20')
    const morning = getDailyQuote(new Date(2026, 10, 20, 7, 15))
    const evening = getDailyQuote(new Date(2026, 10, 20, 22, 45))
    expect(a).toEqual(b)
    expect(morning).toEqual(a)
    expect(evening).toEqual(a)
  })

  it('连续日期顺次轮换，一个完整周期覆盖全部句子后循环', () => {
    const start = '2026-11-16'
    const n = DAILY_QUOTES.length
    const seen = new Set<string>()
    for (let i = 0; i < n; i++) {
      const d = addDays(start, i)
      const q = getDailyQuote(d)
      seen.add(q.zh)
      const next = getDailyQuote(addDays(d, 1))
      expect(next).not.toEqual(q)
    }
    expect(seen.size).toBe(n)
    expect(getDailyQuote(addDays(start, n))).toEqual(getDailyQuote(start))
  })

  it('跨月、闰年、跨年边界都能平滑顺次轮换', () => {
    const pairs: [string, string][] = [
      ['2026-01-31', '2026-02-01'],
      ['2028-02-28', '2028-02-29'],
      ['2028-02-29', '2028-03-01'],
      ['2026-12-31', '2027-01-01'],
    ]
    const n = DAILY_QUOTES.length
    for (const [d1, d2] of pairs) {
      const i1 = quoteIndexForDate(d1)
      const i2 = quoteIndexForDate(d2)
      expect(i2).toBe((i1 + 1) % n)
    }
  })

  it('早于基准日期的日期也返回有效下标并顺次轮换', () => {
    const n = DAILY_QUOTES.length
    const i1 = quoteIndexForDate('2025-12-30')
    const i2 = quoteIndexForDate('2025-12-31')
    const i3 = quoteIndexForDate('2026-01-01')
    expect(i1).toBeGreaterThanOrEqual(0)
    expect(i1).toBeLessThan(n)
    expect(i2).toBe((i1 + 1) % n)
    expect(i3).toBe((i2 + 1) % n)
    expect(getDailyQuote('2025-12-31')).toEqual(DAILY_QUOTES[i2])
  })

  it('非法日期字符串安全回退到第一句，且支持自定义句库', () => {
    expect(quoteIndexForDate('not-a-date')).toBe(0)
    expect(quoteIndexForDate('2026-02-30')).toBe(0)
    expect(getDailyQuote('invalid')).toEqual(DAILY_QUOTES[0])

    const custom: DailyQuote[] = [
      { zh: '第一句', en: 'First' },
      { zh: '第二句', en: 'Second' },
    ]
    expect(getDailyQuote('2026-01-01', custom)).toEqual(custom[0])
    expect(getDailyQuote('2026-01-02', custom)).toEqual(custom[1])
    expect(getDailyQuote('2026-01-03', custom)).toEqual(custom[0])
  })
})
