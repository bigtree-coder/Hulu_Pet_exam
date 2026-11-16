import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useSettings, useToday } from '../hooks'
import { getWritingFeedback } from '../lib/ai'
import { db } from '../lib/db'
import { weekOf, WEEKS } from '../lib/plan'
import { setTaskDone } from '../lib/store'
import { speak } from '../lib/tts'
import type { AiFeedback, Writing as WritingRow } from '../lib/types'

export const countWords = (s: string) => (s.trim().match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).length

export function FeedbackCard({ fb }: { fb: AiFeedback }) {
  return (
    <div className="card done stack">
      {fb.good.map((g, i) => (
        <div key={i}><p>👍 {g.en}</p><p className="zh">{g.zh}</p></div>
      ))}
      <div><p>💡 {fb.tip.en}</p><p className="zh">{fb.tip.zh}</p></div>
    </div>
  )
}

export default function Writing() {
  const today = useToday()
  const settings = useSettings()
  const [row, setRow] = useState<WritingRow>()
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const rowId = useRef<number | undefined>(undefined)
  const week = settings ? weekOf(today, settings.startDate) : 0
  const task = week ? WEEKS[week - 1].writing ?? WEEKS[10].writing! : undefined
  const weekWords = useLiveQuery(() => (week ? db.words.where('week').equals(week).toArray() : []), [week])
  const history = useLiveQuery(() => db.writings.orderBy('date').reverse().toArray(), [])

  // 今天的稿件：有就接着写，刷新不丢
  useEffect(() => {
    if (!week) return
    void db.writings.where('date').equals(today).first().then((w) => {
      rowId.current = w?.id
      setRow(w)
      setText(w?.text ?? '')
    })
  }, [today, week])

  const persist = async (value: string): Promise<WritingRow> => {
    const base: WritingRow = { ...(row ?? { date: today, week, prompt: task!.prompt }), text: value, wordCount: countWords(value) }
    if (rowId.current !== undefined) base.id = rowId.current
    rowId.current = await db.writings.put(base)
    const savedRow = { ...base, id: rowId.current }
    setRow(savedRow)
    return savedRow
  }

  // 停笔 1 秒自动存草稿
  useEffect(() => {
    if (!task || text === (row?.text ?? '')) return
    const id = setTimeout(() => void persist(text), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  // 切到后台或离开页面时立刻存一次，不等那 1 秒
  const latest = useRef({ text, saved: row?.text ?? '', persist })
  latest.current = { text, saved: row?.text ?? '', persist }
  useEffect(() => {
    const flush = () => { const l = latest.current; if (task && l.text !== l.saved) void l.persist(l.text) }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); flush() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!task])

  if (!settings || !task) return null
  const n = countWords(text)
  const aiOn = settings.aiEnabled && !!settings.aiKey

  const save = async () => {
    await persist(text)
    await setTaskDone(today, 'writing', true, 10)
    setStatus('Saved! 已保存。')
  }

  const feedback = async () => {
    setBusy(true)
    setStatus('')
    try {
      const saved = await persist(text)
      const fb = await getWritingFeedback(settings.aiKey, saved.prompt, text)
      await db.writings.update(saved.id!, { aiFeedback: fb })
      setRow({ ...saved, aiFeedback: fb })
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '出了点问题，稍后再试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <h1>Writing <span className="zh">写作</span></h1>
      <div className="card sun stack">
        <span className="pill" style={{ justifySelf: 'start' }}>Week {week}</span>
        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{row?.prompt ?? task.prompt}</p>
        <p className="zh">{task.zh}</p>
      </div>
      {!!weekWords?.length && (
        <div className="stack">
          <p className="zh">Try to use 2 of this week's words. 试着用上 2 个本周新词（点一下可以听）：</p>
          <div className="chips">
            {weekWords.map((w) => (
              <button key={w.id} className="chip" onClick={() => speak(w.word)} title={w.meaningZh}>{w.word}</button>
            ))}
          </div>
        </div>
      )}
      <textarea
        className="field" value={text} onChange={(e) => { setText(e.target.value); setStatus('') }}
        placeholder="Write here…" lang="en" aria-label="Your writing"
      />
      <div className="row spread">
        <span><b>{n}</b> words <span className="zh">· aim for about {task.target}</span></span>
        <div className="row">
          {aiOn && <button className="btn ghost" disabled={busy || n === 0} onClick={feedback}>{busy ? 'Thinking…' : '✨ Feedback'}</button>}
          <button className="btn" disabled={n === 0} onClick={save}>Save</button>
        </div>
      </div>
      {status && <div className="card done">{status}</div>}
      {row?.aiFeedback && <FeedbackCard fb={row.aiFeedback} />}

      {history && history.filter((h) => h.date !== today).length > 0 && (
        <>
          <h2>My writing <span className="zh">以前的稿件</span></h2>
          {history.filter((h) => h.date !== today).map((h) => (
            <details key={h.id} className="card">
              <summary>{h.date} · {h.wordCount} words</summary>
              <p className="note">{h.prompt}</p>
              <p className="pre">{h.text}</p>
            </details>
          ))}
        </>
      )}
    </div>
  )
}
