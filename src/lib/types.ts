export interface Word {
  id?: number
  word: string
  pos: string
  meaningZh: string
  exampleEn: string
  topic: string
  week: number
  needSpelling: boolean
}

export interface CardState {
  wordId: number
  /** 0 = 未学，1–6 = 六级箱子 */
  box: number
  /** 'YYYY-MM-DD'；空串表示不再安排（未学，或已掌握且抽查通过） */
  dueDate: string
  lapses: number
  known: boolean
}

export type QType = 'listen' | 'read' | 'zh2en' | 'cloze' | 'spell'

export interface ReviewLog {
  id?: number
  wordId: number
  time: number
  date: string
  qtype: QType
  correct: boolean
  boxBefore: number
  boxAfter: number
}

export type TaskType =
  | 'words' | 'listening' | 'reading' | 'writing' | 'speaking'
  | 'focus' | 'extensive' | 'practice' | 'chat'

export interface DailyTask {
  /** `${date}:${type}` */
  id: string
  date: string
  type: TaskType
  done: boolean
  minutes: number
  minimal: boolean
}

export interface DayMeta {
  date: string
  /** 手动切换的最小任务日；未设置时按星期默认（周五） */
  minimal?: boolean
  restCard?: boolean
  sticker?: string
}

export interface Recording {
  id?: number
  date: string
  week: number
  part: string
  prompt: string
  blob: Blob
  seconds: number
}

export interface AiFeedback {
  good: { en: string; zh: string }[]
  tip: { en: string; zh: string }
}

export interface Writing {
  id?: number
  date: string
  week: number
  prompt: string
  text: string
  wordCount: number
  aiFeedback?: AiFeedback
}

export interface Settings {
  key: 'main'
  startDate: string
  newPerDay: number
  passHash: string
  aiEnabled: boolean
  aiKey: string
}
