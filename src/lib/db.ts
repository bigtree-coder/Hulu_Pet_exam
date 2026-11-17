import Dexie, { type Table } from 'dexie'
import type { CardState, DailyTask, DayMeta, ListeningAudio, Recording, ReviewLog, Settings, Word, Writing } from './types'

export class PetDB extends Dexie {
  words!: Table<Word, number>
  cards!: Table<CardState, number>
  logs!: Table<ReviewLog, number>
  tasks!: Table<DailyTask, string>
  days!: Table<DayMeta, string>
  recordings!: Table<Recording, number>
  writings!: Table<Writing, number>
  settings!: Table<Settings, string>
  audios!: Table<ListeningAudio, number>

  constructor(name = 'hulu-pet') {
    super(name)
    this.version(1).stores({
      words: '++id, &word, topic, week',
      cards: 'wordId, dueDate, box',
      logs: '++id, wordId, date',
      tasks: 'id, date',
      days: 'date',
      recordings: '++id, date',
      writings: '++id, date',
      settings: 'key',
    })
    // v2：听力音频。音频文件大，不进 JSON 备份
    this.version(2).stores({ audios: '++id, week' })
  }
}

export const db = new PetDB()

export const DEFAULT_SETTINGS: Settings = {
  key: 'main',
  startDate: '2026-11-16',
  newPerDay: 8,
  passHash: '',
  aiEnabled: false,
  aiKey: '',
}
