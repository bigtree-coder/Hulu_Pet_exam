import type { Word } from './types'

/** 解析 CSV 文本为二维数组，支持双引号包裹和 "" 转义 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      rows.push(row); row = []
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

export interface CsvResult {
  words: Word[]
  /** 给家长看的中文错误说明 */
  errors: string[]
}

const truthy = (s: string) => ['1', 'true', 'yes', 'y', '是'].includes(s.trim().toLowerCase())

/** 列顺序：word,pos,meaning_zh,example_en,topic,week,need_spelling（首行为表头时自动跳过） */
export function parseWordCsv(text: string): CsvResult {
  const rows = parseCsvRows(text)
  const words: Word[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  const hasHeader = rows[0]?.[0]?.trim().toLowerCase() === 'word'
  rows.forEach((r, idx) => {
    if (idx === 0 && hasHeader) return
    const line = idx + 1
    const [word = '', pos = '', meaningZh = '', exampleEn = '', topic = '', week = '', spell = ''] = r.map((c) => c.trim())
    if (!word || !meaningZh) { errors.push(`第 ${line} 行：缺少单词或中文释义，已跳过`); return }
    const key = word.toLowerCase()
    if (seen.has(key)) { errors.push(`第 ${line} 行：「${word}」重复，已跳过`); return }
    seen.add(key)
    let wk = parseInt(week, 10)
    if (!(wk >= 1 && wk <= 12)) {
      if (week !== '') errors.push(`第 ${line} 行：「${word}」的周次「${week}」不在 1–12，按第 1 周处理`)
      wk = 1
    }
    words.push({ word, pos, meaningZh, exampleEn, topic: topic || '未分类', week: wk, needSpelling: truthy(spell) })
  })
  if (!words.length && !errors.length) errors.push('文件里没有找到单词')
  return { words, errors }
}
