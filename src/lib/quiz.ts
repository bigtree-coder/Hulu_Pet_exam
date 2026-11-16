import type { QType, Word } from './types'

export type Rnd = () => number

export function shuffle<T>(arr: T[], rnd: Rnd = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 把例句里的目标词（含简单词形变化）换成空格线；例句里没有这个词则返回 null */
export function makeCloze(example: string, word: string): string | null {
  const re = new RegExp(`(^|[^A-Za-z])(${escapeRe(word)}[a-z]*)(?![A-Za-z])`, 'i')
  if (!re.test(example)) return null
  return example.replace(re, '$1_____')
}

/**
 * 题型按熟练度递进：
 * 0–2 级：听音选义 / 看词选义；3–4 级：看中文选英文 / 例句填空；
 * 5–6 级：标了「需要拼写」的出拼写题，其余例句填空。
 */
export function pickType(word: Word, box: number, canSpeak: boolean, rnd: Rnd = Math.random): QType {
  const hasCloze = makeCloze(word.exampleEn, word.word) !== null
  if (box <= 2) {
    if (box === 0 || !canSpeak) return 'read'
    return rnd() < 0.5 ? 'listen' : 'read'
  }
  if (box <= 4) return hasCloze && rnd() < 0.5 ? 'cloze' : 'zh2en'
  if (word.needSpelling) return 'spell'
  return hasCloze ? 'cloze' : 'zh2en'
}

export interface Question {
  type: QType
  word: Word
  /** 四选一的选项（拼写题为空） */
  options: Word[]
  cloze?: string
}

export function buildQuestion(word: Word, type: QType, pool: Word[], rnd: Rnd = Math.random): Question {
  if (type === 'spell') return { type, word, options: [] }
  const seen = new Set([word.word.toLowerCase()])
  const meanings = new Set([word.meaningZh])
  const candidates = shuffle(pool, rnd).filter((w) => {
    const k = w.word.toLowerCase()
    if (seen.has(k) || meanings.has(w.meaningZh)) return false
    seen.add(k)
    meanings.add(w.meaningZh)
    return true
  })
  // 同词性的干扰项优先，例句填空时更不容易靠语法排除
  const samePos = candidates.filter((w) => w.pos === word.pos)
  const others = candidates.filter((w) => w.pos !== word.pos)
  const distractors = [...samePos, ...others].slice(0, 3)
  const q: Question = { type, word, options: shuffle([word, ...distractors], rnd) }
  if (type === 'cloze') q.cloze = makeCloze(word.exampleEn, word.word) ?? undefined
  return q
}

export function checkSpelling(input: string, word: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ')
  return norm(input) === norm(word)
}
