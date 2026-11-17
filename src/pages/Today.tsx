import { useLiveQuery } from 'dexie-react-hooks'
import { KidPlayer } from '../components/AudioPlayer'
import { go, useSettings, useToday } from '../hooks'
import { weekday } from '../lib/dates'
import { db } from '../lib/db'
import { planFor, WEEKS, type TaskDef } from '../lib/plan'
import { audiosForWeek, isMinimal, restCardsLeft, setMinimal, setTaskDone, spendRestCard } from '../lib/store'
import { speak } from '../lib/tts'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Today() {
  const today = useToday()
  const settings = useSettings()
  const meta = useLiveQuery(async () => (await db.days.get(today)) ?? { date: today }, [today])
  const tasks = useLiveQuery(() => db.tasks.where('date').equals(today).toArray(), [today])
  const restLeft = useLiveQuery(() => restCardsLeft(today), [today, meta])
  const wordCount = useLiveQuery(() => db.words.count(), [])
  if (!settings || !meta || !tasks) return null

  const minimal = isMinimal(today, meta)
  const plan = planFor(today, settings.startDate, minimal)
  const wp = WEEKS[plan.week - 1]
  const done = new Set(tasks.filter((t) => t.done).map((t) => t.type))

  const head = (
    <div className="row spread">
      <div>
        <h1>{DAYS[weekday(today)]}</h1>
        <p className="zh">{wp.topic} · {wp.topicZh}</p>
      </div>
      <span className="pill">Week {plan.week}</span>
    </div>
  )

  if (meta.restCard) {
    return (
      <div className="stack">
        {head}
        <div className="card sun center stack">
          <div style={{ fontSize: '3rem' }}>🛋️</div>
          <h2>Rest card day</h2>
          <p className="zh">今天用了休息卡，好好休息，明天见！</p>
        </div>
      </div>
    )
  }

  if (plan.kind === 'rest') {
    return (
      <div className="stack">
        {head}
        <div className="card sun center stack">
          <div style={{ fontSize: '3rem' }}>🌤️</div>
          <h2>It's Sunday. No tasks today!</h2>
          <p className="zh">周日完全休息，不补课。</p>
        </div>
      </div>
    )
  }

  const run = (t: TaskDef) => {
    if (t.action === 'words') go('practice')
    else if (t.action === 'speaking') go('speak')
    else if (t.action === 'writing') go('write')
  }

  return (
    <div className="stack">
      {head}
      {wordCount === 0 && (
        <div className="card sun">
          <p>No words yet. Ask a parent to add the word list.</p>
          <p className="zh">还没有词表，请家长在「家长」面板里导入。</p>
        </div>
      )}
      {meta.sticker && (
        <div className="card sun center">
          <span className="pop">{meta.sticker}</span>
          <h2>All done! You got a sticker.</h2>
          <p className="zh">今天的任务完成啦，收下一枚贴纸！</p>
        </div>
      )}
      {plan.tasks.map((t) => {
        const isDone = done.has(t.type)
        return (
          <div key={t.type} className={`card ${isDone ? 'done' : ''}`}>
            <div className="row">
              <div className="grow">
                <h2>{t.title} <span className="note">· about {t.minutes} min</span></h2>
                <p className="zh">{t.zh}</p>
              </div>
              {t.action === 'tick' ? (
                <button
                  className={`tick ${isDone ? 'on' : ''}`}
                  aria-label={isDone ? `${t.title}: done` : `${t.title}: mark as done`}
                  aria-pressed={isDone}
                  onClick={() => setTaskDone(today, t.type, !isDone, t.minutes)}
                >✓</button>
              ) : isDone ? (
                <button className="btn ghost" onClick={() => run(t)}>✓ Again</button>
              ) : (
                <button className="btn" onClick={() => run(t)}>Start</button>
              )}
            </div>
            <p style={{ marginTop: 8 }}>{t.detail}</p>
            {t.type === 'chat' && <WeekWords week={plan.week} />}
            {(t.type === 'listening' || t.type === 'practice') && <WeekAudios week={plan.week} />}
          </div>
        )
      })}

      {plan.kind !== 'saturday' && (
        <label className="check">
          <input type="checkbox" checked={minimal} onChange={(e) => setMinimal(today, e.target.checked)} />
          <span>Short day: just words <span className="zh">最小任务日</span></span>
        </label>
      )}
      {!meta.sticker && !!restLeft && (
        <button
          className="btn quiet"
          onClick={() => { if (confirm('Use a rest card today?\n今天用一张休息卡吗？')) void spendRestCard(today) }}
        >
          🛋️ Use a rest card <span className="zh">休息卡 · {restLeft} left this week</span>
        </button>
      )}
    </div>
  )
}

/** 家长为本周上传的听力音频；没有上传就什么都不显示，照常用纸质真题和 CD */
function WeekAudios({ week }: { week: number }) {
  const audios = useLiveQuery(() => audiosForWeek(week), [week])
  if (!audios?.length) return null
  return (
    <div className="audio-list">
      {audios.map((a) => (
        <div key={a.id}>
          <b>🎧 {a.name}</b>
          <KidPlayer blob={a.blob} label={a.name} />
        </div>
      ))}
    </div>
  )
}

function WeekWords({ week }: { week: number }) {
  const words = useLiveQuery(() => db.words.where('week').equals(week).toArray(), [week])
  if (!words?.length) return null
  return (
    <details>
      <summary>This week's words · 本周的词</summary>
      <div className="chips">
        {words.map((w) => (
          <button key={w.id} className="chip" onClick={() => speak(w.word)}>{w.word}</button>
        ))}
      </div>
    </details>
  )
}
