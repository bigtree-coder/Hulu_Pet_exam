import { useLiveQuery } from 'dexie-react-hooks'
import { useToday } from '../hooks'
import { db } from '../lib/db'
import { REST_CARDS_PER_WEEK, restCardsLeft, streak } from '../lib/store'

export default function Stickers() {
  const today = useToday()
  const days = useLiveQuery(() => db.days.orderBy('date').toArray(), [])
  const left = useLiveQuery(() => restCardsLeft(today), [today, days])
  if (!days) return null
  const stickers = days.filter((d) => d.sticker)
  const run = streak(days, today)
  // 空格子凑满一行，让她看到下一枚的位置
  const blanks = Math.max(1, 6 - (stickers.length % 6))
  return (
    <div className="stack">
      <h1>My stickers <span className="zh">我的贴纸</span></h1>
      <div className="row">
        <span className="pill">🌟 {stickers.length} stickers</span>
        {run > 1 && <span className="pill">🔥 {run} days in a row</span>}
        <span className="pill">🛋️ {left ?? REST_CARDS_PER_WEEK} rest cards this week</span>
      </div>
      <div className="card">
        <div className="sticker-grid">
          {stickers.map((d) => <div key={d.date} className="sticker" title={d.date}>{d.sticker}</div>)}
          {Array.from({ length: blanks }, (_, i) => <div key={i} className="sticker empty" />)}
        </div>
      </div>
      <p className="zh">Finish all of today's tasks to get a sticker. 完成当天任务得一枚贴纸；用休息卡的日子不算断签。</p>
    </div>
  )
}
