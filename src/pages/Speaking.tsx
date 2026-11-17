import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { KidPlayer } from '../components/AudioPlayer'
import { useSettings, useToday } from '../hooks'
import { db } from '../lib/db'
import { weekOf, WEEKS } from '../lib/plan'
import { setTaskDone } from '../lib/store'
import type { Recording } from '../lib/types'

export default function Speaking() {
  const today = useToday()
  const settings = useSettings()
  const history = useLiveQuery(() => db.recordings.orderBy('date').reverse().toArray(), [])
  const [state, setState] = useState<'idle' | 'recording' | 'review'>('idle')
  const [take, setTake] = useState<{ blob: Blob; seconds: number }>()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const startedAt = useRef(0)

  useEffect(() => () => { recorder.current?.stream.getTracks().forEach((t) => t.stop()) }, [])

  if (!settings) return null
  const week = weekOf(today, settings.startDate)
  const card = WEEKS[week - 1].speaking

  const start = async () => {
    setError('')
    setSaved(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = ['audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m))
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setTake({ blob: new Blob(chunks, { type: rec.mimeType }), seconds: Math.round((Date.now() - startedAt.current) / 1000) })
        setState('review')
      }
      recorder.current = rec
      startedAt.current = Date.now()
      rec.start()
      setState('recording')
    } catch {
      setError('The microphone is not available. Ask a parent for help. 麦克风用不了，请家长帮忙看看浏览器权限。')
    }
  }

  const save = async () => {
    if (!take) return
    const rec: Recording = { date: today, week, part: card.part, prompt: card.prompt, blob: take.blob, seconds: take.seconds }
    await db.recordings.add(rec)
    await setTaskDone(today, 'speaking', true, 10)
    setTake(undefined)
    setState('idle')
    setSaved(true)
  }

  return (
    <div className="stack">
      <h1>Speaking <span className="zh">口语录音</span></h1>
      <div className="card sun stack">
        <span className="pill" style={{ justifySelf: 'start' }}>Week {week} · {card.part}</span>
        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{card.prompt}</p>
        <p className="zh">{card.zh}。试着用上 2 个本周的新词。</p>
      </div>

      {state === 'idle' && <button className="btn big" onClick={start}>🎙️ Start recording</button>}
      {state === 'recording' && (
        <>
          <p className="center pulse">● Recording… <span className="zh">正在录音</span></p>
          <button className="btn big" onClick={() => recorder.current?.stop()}>⏹ Stop</button>
        </>
      )}
      {state === 'review' && take && (
        <div className="card stack">
          <p>Listen to yourself. Happy with it? <span className="zh">听一听，满意就保存。</span></p>
          <KidPlayer blob={take.blob} fallbackSeconds={take.seconds} label="your recording" />
          <div className="row">
            <button className="btn grow" onClick={save}>Save</button>
            <button className="btn ghost grow" onClick={() => { setTake(undefined); setState('idle') }}>Try again</button>
          </div>
        </div>
      )}
      {error && <div className="card sun">{error}</div>}
      {saved && <div className="card done">Saved! <span className="zh">已保存。</span></div>}

      {!!history?.length && (
        <>
          <h2>My recordings <span className="zh">以前的录音</span></h2>
          {history.map((r) => (
            <div key={r.id} className="card stack">
              <div className="row spread">
                <b>{r.date}</b>
                <span className="pill">Week {r.week} · {r.part}</span>
              </div>
              <p className="note">{r.prompt}</p>
              <KidPlayer blob={r.blob} fallbackSeconds={r.seconds} label={r.date} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
