import { diffDays, weekday } from './dates'
import type { TaskType } from './types'

export interface WeekPlan {
  topic: string
  topicZh: string
  /** 第 1–8 周的分项内容；第 9–12 周用 focus / weekend */
  listening?: string
  reading?: string
  focus?: string
  weekend?: string
  writing?: { prompt: string; zh: string; target: number }
  speaking: { part: string; prompt: string; zh: string }
}

export const WEEKS: WeekPlan[] = [
  {
    topic: 'Daily life & school', topicZh: '日常生活、学校',
    listening: 'Do one practice test for fun. No clock! 做一套真题摸底，不计时',
    reading: 'Do one practice test for fun. No clock! 做一套真题摸底，不计时',
    writing: { prompt: 'Write 3 full sentences about your school day.', zh: '写 3 个完整的句子，说说你在学校的一天。', target: 20 },
    speaking: { part: 'Part 1', prompt: "What's your name? Where do you live? Tell me about your family. What do you like doing in your free time?", zh: '自我介绍、家庭、爱好' },
  },
  {
    topic: 'Food & shopping', topicZh: '食物、购物',
    listening: 'Part 1: pictures 看图选择',
    reading: 'Read one chapter of your storybook. 分级读物读 1 章',
    writing: { prompt: "Write 5 sentences about food you love or a shopping trip. Use this week's new words.", zh: '用本周新词写 5 句话，说说你爱吃的东西或一次购物。', target: 35 },
    speaking: { part: 'Part 1', prompt: "What's your favourite food? Why? Do you like going shopping? Why or why not? Always add \"because…\"", zh: '每个回答加一句理由（because…）' },
  },
  {
    topic: 'Sports & hobbies', topicZh: '运动、爱好',
    listening: 'Part 1 + Part 2: short talks 短对话',
    reading: 'Part 1: short texts 短文本理解',
    writing: { prompt: 'Your friend Sam asks: "What sport or hobby do you like best?" Write a short email to Sam (40–50 words).', zh: '给朋友 Sam 回一封短邮件，说说你最喜欢的运动或爱好。', target: 45 },
    speaking: { part: 'Photo talk', prompt: 'Choose one of your own photos. Who is in it? Where are you? What are you doing? How do you feel?', zh: '描述一张自己的照片' },
  },
  {
    topic: 'Travel & transport', topicZh: '旅行、交通',
    listening: 'Part 2: short talks 短对话',
    reading: 'Part 2: matching people 人物匹配',
    writing: { prompt: 'Your friend Alex is coming to your city. Write an email (60 words): tell Alex how to get to your home, and say what you can do together.', zh: '写 60 词邮件，回应 2 个要点：怎么到你家、可以一起做什么。', target: 60 },
    speaking: { part: 'Part 2', prompt: 'Pick a picture from your book. Talk about it for one minute: the people, the place, what is happening.', zh: '看图说 1 分钟' },
  },
  {
    topic: 'Nature, weather & animals', topicZh: '自然、天气、动物',
    listening: 'Part 3: fill the gaps 填空',
    reading: 'Part 3: long text 长文选择',
    writing: { prompt: 'Your teacher Mrs Lake is planning a class trip to a nature park. Write an email (80 words): say you are pleased, say which day is best, suggest what to bring, and ask about the animals there.', zh: '写 80 词邮件，回应 4 个要点。', target: 80 },
    speaking: { part: 'Part 2', prompt: 'Describe a picture. Use place words: on the left, on the right, in the middle, in the background, next to, behind.', zh: '看图说话，加上方位词' },
  },
  {
    topic: 'Entertainment & media', topicZh: '娱乐、媒体',
    listening: 'Part 3: fill the gaps 填空',
    reading: 'Part 4: put sentences back 句子还原',
    writing: { prompt: 'Your friend Jo wants to watch something with you this weekend. Write an email (100 words): say thank you, suggest a film or show, explain why you like it, and say when you are free.', zh: '写 100 词邮件，回应 4 个要点。', target: 100 },
    speaking: { part: 'Part 3', prompt: 'Your class wants a present for your teacher: a book, flowers, a cake, a mug or a plant. Talk about each one. Which is best?', zh: '和搭档讨论几个选项，选出最好的' },
  },
  {
    topic: 'Health, body & feelings', topicZh: '健康、身体、感受',
    listening: 'Part 4: long interview 长访谈',
    reading: 'Part 5: choose the word 完形选词',
    writing: { prompt: 'Write a story (80 words). It must begin: "When I woke up, I knew something was different."', zh: '续写故事，约 80 词，用给出的句子开头。', target: 80 },
    speaking: { part: 'Part 3', prompt: 'A friend wants to get fitter: swimming, cycling, dancing, football or walking? Use: "I agree because…", "I\'m not sure about that…", "What do you think?"', zh: '练习表达同意和不同意' },
  },
  {
    topic: 'Work & technology', topicZh: '工作、科技',
    listening: 'Part 4: long interview 长访谈',
    reading: 'Part 6: open gaps 开放填空',
    writing: { prompt: 'Choose one (100 words). Article: "What technology do you use every day? What would you like to invent?" OR Story beginning: "Jo opened the box and found a strange machine."', zh: '写 100 词的文章或故事，二选一。', target: 100 },
    speaking: { part: 'Part 4', prompt: 'What job would you like to do one day? Why? Do you think robots will help us at school? Is it good to use phones a lot?', zh: '延伸讨论' },
    weekend: 'Full Reading + Listening test, with a clock this time. 完整做一套阅读和听力并计时',
  },
  {
    topic: 'Review', topicZh: '综合复习',
    focus: 'Do two Reading parts in a row, with a clock. 阅读两个 Part 连做并计时',
    weekend: 'Full Listening test. 听力整套',
    writing: { prompt: 'Open one of your old pieces of writing. Make it better: fix one thing, add one new idea.', zh: '改一篇旧稿：改一处，加一个新想法。', target: 100 },
    speaking: { part: 'Part 1 + 2', prompt: 'Answer three Part 1 questions, then describe a picture for one minute.', zh: 'Part 1 和 Part 2 连起来说' },
  },
  {
    topic: 'Review', topicZh: '综合复习',
    focus: 'Look back at questions you missed. Why was the right answer right? 错题回顾',
    weekend: 'Mock test 1 — do it over two days. 第一次完整模拟，分两天做',
    writing: { prompt: 'Write an article (100 words): "My favourite place". Where is it? What can you do there? Why do you like it?', zh: '写 100 词文章：我最喜欢的地方。', target: 100 },
    speaking: { part: 'Parts 1–4', prompt: 'Record all four parts in one go: Part 1 questions, Part 2 picture, Part 3 choices, Part 4 opinions.', zh: '四个 Part 连起来录一遍' },
  },
  {
    topic: 'Review', topicZh: '综合复习',
    focus: 'Practise your two trickiest parts from the mock test. 针对模拟里最弱的两个 Part 补练',
    weekend: 'Full Writing paper, 45 minutes. 写作整套 45 分钟',
    writing: { prompt: 'Write an email or a story (100 words). Choose a question from your test book.', zh: '从真题里选一道写作题，写 100 词。', target: 100 },
    speaking: { part: 'Your choice', prompt: 'Choose the part you find hardest and record it again. Listen. Can you add one more idea?', zh: '最不熟的 Part 再录一遍' },
  },
  {
    topic: 'Light review', topicZh: '轻量复习',
    focus: 'Easy week: words and reading aloud only. 轻量复习，只做单词和朗读',
    weekend: 'Mock test 2. Then listen to your Week 1 recording together! 第二次完整模拟，然后一起回看 12 周的录音和作文',
    speaking: { part: 'Read aloud', prompt: 'Read one page of your favourite storybook aloud. Take your time.', zh: '朗读一页最喜欢的故事书' },
  },
]

export const TOTAL_WEEKS = WEEKS.length

/** 当前周次，1–12；开始日之前算第 1 周，12 周之后停在第 12 周 */
export function weekOf(date: string, startDate: string): number {
  const w = Math.floor(diffDays(startDate, date) / 7) + 1
  return Math.min(TOTAL_WEEKS, Math.max(1, w))
}

export type DayKind = 'school' | 'minimal' | 'saturday' | 'rest'

export interface TaskDef {
  type: TaskType
  title: string
  zh: string
  minutes: number
  detail: string
  /** 在工具里完成，还是线下做完手动打勾 */
  action: 'words' | 'speaking' | 'writing' | 'tick'
}

export interface DayPlan {
  week: number
  kind: DayKind
  tasks: TaskDef[]
}

/** 周五默认是最小任务日 */
export function defaultMinimal(date: string): boolean {
  return weekday(date) === 5
}

export function newWordLimit(week: number, setting: number, minimal: boolean): number {
  if (minimal) return 0
  // 第三阶段新词量降到每天 5 个，把时间让给复习
  return week >= 9 ? Math.min(setting, 5) : setting
}

export function planFor(date: string, startDate: string, minimal: boolean): DayPlan {
  const week = weekOf(date, startDate)
  const wp = WEEKS[week - 1]
  const dow = weekday(date)
  const words = (min: boolean): TaskDef => ({
    type: 'words', title: 'Words', zh: min ? '只复习，不学新词' : '复习到期的词，再学新词',
    minutes: 10, detail: wp.topic, action: 'words',
  })

  if (dow === 0) return { week, kind: 'rest', tasks: [] }

  if (dow === 6) {
    const tasks: TaskDef[] = [
      { type: 'extensive', title: 'Story time', zh: '分级读物或英文动画', minutes: 30, detail: 'Read your storybook or watch a cartoon in English. Just enjoy it!', action: 'tick' },
      { type: 'practice', title: week >= 9 || wp.weekend ? 'Weekend challenge' : 'Test practice', zh: '本周题型练习', minutes: week >= 9 ? 30 : 20, detail: wp.weekend ?? `${wp.listening} · ${wp.reading}`, action: 'tick' },
      { type: 'chat', title: 'Chat & quiz your parent', zh: '和家长聊本周内容，再挑 10 个词考家长', minutes: 10, detail: `Talk about: ${wp.topic}. Then pick 10 words and test your parent!`, action: 'tick' },
    ]
    return { week, kind: 'saturday', tasks }
  }

  if (minimal) return { week, kind: 'minimal', tasks: [words(true)] }

  const tasks: TaskDef[] = [words(false)]
  const speaking: TaskDef = { type: 'speaking', title: `Speaking · ${wp.speaking.part}`, zh: wp.speaking.zh, minutes: 10, detail: wp.speaking.prompt, action: 'speaking' }
  const inputDay = dow === 1 || dow === 3 || dow === 5 // 周一、三（及改成完整日的周五）：听力 + 口语

  if (week >= 9) {
    if (week < TOTAL_WEEKS && wp.focus) {
      tasks.push({ type: 'focus', title: 'Focus', zh: '本周重点', minutes: 15, detail: wp.focus, action: 'tick' })
    }
    if (inputDay || !wp.writing) tasks.push(speaking)
    else tasks.push({ type: 'writing', title: 'Writing', zh: wp.writing.zh, minutes: 10, detail: wp.writing.prompt, action: 'writing' })
    return { week, kind: 'school', tasks }
  }

  if (inputDay) {
    tasks.push({ type: 'listening', title: 'Listening', zh: '听力（纸质真题）', minutes: 15, detail: wp.listening!, action: 'tick' })
    tasks.push(speaking)
  } else {
    tasks.push({ type: 'reading', title: 'Reading', zh: '阅读（纸质真题或读物）', minutes: 15, detail: wp.reading!, action: 'tick' })
    tasks.push({ type: 'writing', title: 'Writing', zh: wp.writing!.zh, minutes: 10, detail: wp.writing!.prompt, action: 'writing' })
  }
  return { week, kind: 'school', tasks }
}
