import { useEffect, useMemo, useRef, useState } from 'react'
import { go, useToday } from '../hooks'
import { db } from '../lib/db'
import { newWordLimit, weekOf } from '../lib/plan'
import { buildQuestion, checkSpelling, pickType, shuffle, type Question } from '../lib/quiz'
import { newCard, selectSession } from '../lib/srs'
import { getSettings, isMinimal, recordAnswer, setTaskDone } from '../lib/store'
import { canSpeak, speak } from '../lib/tts'
import type { CardState, Word } from '../lib/types'

type Item = { kind: 'intro'; word: Word } | { kind: 'q'; word: Word; retry: boolean }

interface Session {
  queue: Item[]
  pool: Word[]
  cards: Map<number, CardState>
  hasWords: boolean
}

async function loadSession(today: string): Promise<Session> {
  const [settings, words, cards, logs, meta] = await Promise.all([
    getSettings(), db.words.toArray(), db.cards.toArray(), db.logs.where('date').equals(today).toArray(), db.days.get(today),
  ])
  const week = weekOf(today, settings.startDate)
  const byId = new Map(words.map((w) => [w.id!, w]))
  const { reviewIds, newIds } = selectSession({
    cards,
    wordWeeks: new Map(words.map((w) => [w.id!, w.week])),
    today,
    week,
    newLimit: newWordLimit(week, settings.newPerDay, isMinimal(today, meta)),
    newDoneToday: new Set(logs.filter((l) => l.boxBefore === 0).map((l) => l.wordId)).size,
    reviewsDoneToday: new Set(logs.filter((l) => l.boxBefore > 0).map((l) => l.wordId)).size,
  })
  const queue: Item[] = shuffle(reviewIds).map((id) => ({ kind: 'q', word: byId.get(id)!, retry: false }))
  // 新词每 4 个一组：先认识，再马上各问一遍
  for (let i = 0; i < newIds.length; i += 4) {
    const group = newIds.slice(i, i + 4).map((id) => byId.get(id)!)
    group.forEach((word) => queue.push({ kind: 'intro', word }))
    shuffle(group).forEach((word) => queue.push({ kind: 'q', word, retry: false }))
  }
  return { queue, pool: words, cards: new Map(cards.map((c) => [c.wordId, c])), hasWords: words.length > 0 }
}

export default function Practice() {
  const today = useToday()
  const [session, setSession] = useState<Session>()
  const [queue, setQueue] = useState<Item[]>([])
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'ask' | 'right' | 'wrong'>('ask')
  const [picked, setPicked] = useState<number>()
  const [typed, setTyped] = useState('')
  const seen = useRef(new Set<number>())
  const levelled = useRef(new Set<number>())
  const startedAt = useRef(Date.now())
  const finished = useRef(false)

  useEffect(() => {
    let alive = true
    void loadSession(today).then((s) => { if (alive) { setSession(s); setQueue(s.queue) } })
    return () => { alive = false }
    // 只在进入页面时出一次题，跨午夜也不中途换题
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const item = queue[idx]
  const question: Question | undefined = useMemo(() => {
    if (!session || !item || item.kind !== 'q') return undefined
    const box = item.retry ? 0 : (session.cards.get(item.word.id!) ?? newCard(item.word.id!)).box
    return buildQuestion(item.word, pickType(item.word, box, canSpeak()), session.pool)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, idx])

  useEffect(() => {
    if (question && (question.type === 'listen' || question.type === 'spell')) speak(question.word.word)
  }, [question])

  const isEnd = !!session && idx >= queue.length
  useEffect(() => {
    if (!isEnd || finished.current || !session?.hasWords) return
    finished.current = true
    const minutes = Math.min(20, Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)))
    void setTaskDone(today, 'words', true, minutes)
  }, [isEnd, session, today])

  if (!session) return null

  const next = () => { setPhase('ask'); setPicked(undefined); setTyped(''); setIdx((i) => i + 1) }

  const answer = async (correct: boolean) => {
    if (!question || !item || item.kind !== 'q') return
    const id = question.word.id!
    seen.current.add(id)
    if (!item.retry) {
      const { before, after } = await recordAnswer(id, question.type, correct, today)
      session.cards.set(id, after)
      if (correct && after.box > before.box) levelled.current.add(id)
      // 答错的词在本次练习末尾再出现一次
      if (!correct) setQueue((q) => [...q, { kind: 'q', word: question.word, retry: true }])
    }
    if (correct) { setPhase('right'); setTimeout(next, 900) } else setPhase('wrong')
  }

  if (isEnd) {
    return (
      <div className="stack center" style={{ paddingTop: 48 }}>
        {!session.hasWords ? (
          <>
            <div style={{ fontSize: '4rem' }}>📭</div>
            <h1>No words yet</h1>
            <p className="zh">还没有词表，请家长先导入。</p>
          </>
        ) : seen.current.size === 0 ? (
          <>
            <div style={{ fontSize: '4rem' }}>🌈</div>
            <h1>All caught up!</h1>
            <p className="zh">今天没有要复习的词了。</p>
          </>
        ) : (
          <>
            <div className="pop" style={{ fontSize: '4rem' }}>🎉</div>
            <h1>You met {seen.current.size} words today.</h1>
            <h2>{levelled.current.size} of them levelled up!</h2>
            <p className="zh">今天见了 {seen.current.size} 个词，其中 {levelled.current.size} 个升级。</p>
          </>
        )}
        <button className="btn big" onClick={() => go('today')}>Back to Today</button>
      </div>
    )
  }

  const bar = (
    <div className="row">
      <button className="btn quiet" onClick={() => go('today')} aria-label="Close">✕</button>
      <div className="progress grow" aria-hidden><div style={{ width: `${(idx / queue.length) * 100}%` }} /></div>
    </div>
  )

  if (item.kind === 'intro') {
    const w = item.word
    return (
      <div className="stack">
        {bar}
        <div className="card prompt stack">
          <span className="pill" style={{ justifySelf: 'center' }}>New word · 新词</span>
          <div className="word">{w.word}</div>
          <div><button className="icon-btn" onClick={() => speak(w.word)} aria-label="Listen to the word">🔊</button></div>
          <p><span className="zh">{w.pos && `${w.pos}. `}</span>{w.meaningZh}</p>
          {w.exampleEn && (
            <div className="row" style={{ justifyContent: 'center' }}>
              <p>{w.exampleEn}</p>
              <button className="icon-btn" onClick={() => speak(w.exampleEn)} aria-label="Listen to the sentence">🔊</button>
            </div>
          )}
        </div>
        <button className="btn big" onClick={next}>Next</button>
      </div>
    )
  }

  if (!question) return null
  const w = question.word
  const showMeaning = question.type === 'listen' || question.type === 'read'

  return (
    <div className="stack">
      {bar}
      <div className="card prompt stack">
        {question.type === 'listen' && (
          <>
            <p className="zh">Listen. What does it mean? 听一听，是什么意思？</p>
            <div><button className="icon-btn huge" onClick={() => speak(w.word)} aria-label="Listen again">🔊</button></div>
          </>
        )}
        {question.type === 'read' && (
          <>
            <div className="word">{w.word}</div>
            <div><button className="icon-btn" onClick={() => speak(w.word)} aria-label="Listen">🔊</button></div>
          </>
        )}
        {question.type === 'zh2en' && (
          <>
            <p className="zh">Which word is it? 选出对应的英文</p>
            <div className="word">{w.meaningZh}</div>
          </>
        )}
        {question.type === 'cloze' && (
          <>
            <p className="zh">Choose the missing word. 选词填空</p>
            <div className="sentence">{question.cloze}</div>
          </>
        )}
        {question.type === 'spell' && (
          <>
            <p className="zh">Type the word. 拼出这个词</p>
            <div className="word">{w.meaningZh}</div>
            <div><button className="icon-btn" onClick={() => speak(w.word)} aria-label="Listen">🔊</button></div>
          </>
        )}
      </div>

      {question.type === 'spell' ? (
        <form
          className="stack"
          onSubmit={(e) => { e.preventDefault(); if (phase === 'ask' && typed.trim()) void answer(checkSpelling(typed, w.word)) }}
        >
          <input
            className="field spell" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={phase !== 'ask'}
            autoFocus autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} aria-label="Your spelling"
          />
          {phase === 'ask' && <button className="btn big" disabled={!typed.trim()}>Check</button>}
        </form>
      ) : (
        <div className="options">
          {question.options.map((o, i) => {
            const isAnswer = o === w
            const cls = phase === 'ask' ? '' : isAnswer ? 'answer' : picked === i ? 'picked' : ''
            return (
              <button
                key={o.id} className={`opt ${cls}`} disabled={phase !== 'ask'}
                onClick={() => { setPicked(i); void answer(isAnswer) }}
              >
                {showMeaning ? o.meaningZh : o.word}
              </button>
            )
          })}
        </div>
      )}

      {phase === 'right' && <div className="center"><span className="pop">🌟</span></div>}
      {phase === 'wrong' && (
        <div className="card sun stack">
          <div className="row">
            <div className="grow">
              <h2>{w.word}</h2>
              <p>{w.meaningZh}</p>
            </div>
            <button className="icon-btn" onClick={() => speak(w.word)} aria-label="Listen">🔊</button>
          </div>
          {w.exampleEn && <p>{w.exampleEn}</p>}
          <button className="btn big" onClick={next}>知道了 · Got it</button>
        </div>
      )}
    </div>
  )
}
