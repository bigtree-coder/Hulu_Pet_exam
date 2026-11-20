import { diffDays, isValidDate, todayStr } from './dates'

export interface DailyQuote {
  zh: string
  en: string
}

// 29 句（与 7 互质，确保每个星期几都会轮流看到全部句子，不会固定重复）
export const DAILY_QUOTES: readonly DailyQuote[] = [
  { zh: '今天学到的小小一点，都会慢慢长成大力量。', en: 'A little bit today grows into big strength.' },
  { zh: '不用一次就记住，多见几次就变成老朋友啦。', en: 'Every time you see a word, it becomes more familiar.' },
  { zh: '慢慢来也没关系，认真走好今天这一小步。', en: 'It is okay to go slowly. One small step today is enough.' },
  { zh: '敢开口说英语的你，已经很棒了！', en: 'Trying to speak out loud is already wonderful!' },
  { zh: '每天翻开几分钟，就像给小树浇一点水。', en: 'A few minutes each day is like watering a little tree.' },
  { zh: '遇到不认识的词，正好是认识新朋友的机会。', en: 'A new word is just a new friend waiting to meet you.' },
  { zh: '今天也在坚持，你比昨天更熟悉英语了一点点。', en: 'You are a tiny bit more at home with English than yesterday.' },
  { zh: '声音大一点、慢一点，把想说的话说出来就很好。', en: 'Speak calmly and clearly—your voice matters.' },
  { zh: '写下短短几句话，也是在用英语讲自己的故事。', en: 'Even a few sentences let you tell your own story.' },
  { zh: '休息和练习一样重要，精力满满学得更开心。', en: 'Rest helps you grow just as much as practice does.' },
  { zh: '卡住的时候深呼吸，再试一次看看吧。', en: 'Take a deep breath and give it another gentle try.' },
  { zh: '记住一个喜欢的词，今天就有收获啦。', en: 'Even one favourite word makes today worthwhile.' },
  { zh: '你正在用自己的节奏往前走，这很了不起。', en: 'You are moving forward at your own pace, and that is great.' },
  { zh: '多听一点、多读一点，耳朵和眼睛会悄悄变灵敏。', en: 'The more you listen and read, the easier it feels.' },
  { zh: '学习像搭积木，每天放稳一块就好。', en: 'Learning is like building with blocks—one steady piece a day.' },
  { zh: '今天的努力，未来的你会微笑着感谢它。', en: 'Future you will smile at the care you put in today.' },
  { zh: '用英语聊聊喜欢的事，练习也可以很有趣。', en: 'Talking about things you love makes practice fun.' },
  { zh: '忘了也没关系，想起来的那一刻记得更牢。', en: 'Forgetting is normal—remembering again makes it stronger.' },
  { zh: '不急不慌，把今天的小任务开开心心做完吧。', en: 'No rush today—just enjoy finishing your little tasks.' },
  { zh: '每一次朗读，都在让你的英语越来越顺口。', en: 'Every time you read aloud, your English flows a little smoother.' },
  { zh: '小小的好奇心，会带你看见更大的世界。', en: 'A little curiosity can open a whole wide world.' },
  { zh: '今天愿意静下心练一会儿，就值得给自己点个赞。', en: 'Taking a quiet moment to practise today is something to be proud of.' },
  { zh: '把听懂的那一句记在心里，为你自己鼓鼓掌！', en: 'Cheer for yourself whenever a sentence clicks!' },
  { zh: '一步一个脚印，时间会把坚持变成礼物。', en: 'Step by step, steady days turn into a wonderful gift.' },
  { zh: '句子短也没关系，清楚表达出想法就很棒。', en: 'Short and clear sentences are wonderful.' },
  { zh: '今天也要温柔地对待自己，认真练，轻松学。', en: 'Be kind to yourself today—practise gently and have fun.' },
  { zh: '每多读一页故事，英语就离你的生活更近一步。', en: 'Every story page brings English closer to everyday life.' },
  { zh: '小小进步不容易被看见，但它每天都在悄悄发生。', en: 'Small progress is quiet, yet it happens every single day.' },
  { zh: '带着好心情开始吧，今天的你一定可以！', en: 'Start with a bright mood—you have got this today!' },
]

const EPOCH_DATE = '2026-01-01'

/** 按本地日历日期确定性地计算激励语下标；同一天永远相同，隔天顺次轮换 */
export function quoteIndexForDate(date: string | Date, total: number = DAILY_QUOTES.length): number {
  if (total <= 0) return 0
  const dateStr = typeof date === 'string' ? date : todayStr(date)
  if (!isValidDate(dateStr)) return 0
  const days = diffDays(EPOCH_DATE, dateStr)
  return ((days % total) + total) % total
}

/** 获取指定日期的每日激励语（纯函数，完全离线） */
export function getDailyQuote(
  date: string | Date,
  quotes: readonly DailyQuote[] = DAILY_QUOTES,
): DailyQuote {
  if (quotes.length === 0) {
    throw new Error('DAILY_QUOTES must not be empty')
  }
  return quotes[quoteIndexForDate(date, quotes.length)]
}
