import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { useSettings, useToday } from '../hooks'
import { exportAll, importAll } from '../lib/backup'
import { parseWordCsv } from '../lib/csv'
import { addDays, isValidDate, weekStart } from '../lib/dates'
import { db } from '../lib/db'
import { checkPassword, hashPassword } from '../lib/hash'
import { weekOf, WEEKS } from '../lib/plan'
import { deleteWords, importWords, saveSettings, setKnown } from '../lib/store'
import type { Settings } from '../lib/types'
import { AudioPlayer } from './Speaking'
import { FeedbackCard } from './Writing'

const TABS = ['本周概览', '词表', '录音和作文', '设置'] as const
type Tab = (typeof TABS)[number]

export default function Parent() {
  const settings = useSettings()
  const [unlocked, setUnlocked] = useState(false)
  const [tab, setTab] = useState<Tab>('本周概览')
  if (!settings) return null
  if (!unlocked) return <Gate settings={settings} onOpen={() => setUnlocked(true)} />
  return (
    <div className="stack">
      <h1>家长面板</h1>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === '本周概览' && <Overview settings={settings} />}
      {tab === '词表' && <WordList />}
      {tab === '录音和作文' && <Records />}
      {tab === '设置' && <SettingsTab settings={settings} />}
    </div>
  )
}

function Gate({ settings, onOpen }: { settings: Settings; onOpen: () => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState('')
  const first = !settings.passHash
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (first) {
      if (pw.length < 4) return setMsg('密码至少 4 位')
      if (pw !== pw2) return setMsg('两次输入不一致')
      await saveSettings({ passHash: await hashPassword(pw) })
      onOpen()
    } else if (await checkPassword(pw, settings.passHash)) onOpen()
    else setMsg('密码不对')
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h1>家长面板</h1>
      <p className="zh">{first ? '第一次进入，请设置一个家长密码。' : '请输入家长密码。'}</p>
      <input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="密码" autoFocus aria-label="密码" />
      {first && <input className="field" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="再输入一次" aria-label="再输入一次密码" />}
      {msg && <p>{msg}</p>}
      <button className="btn big">{first ? '设置并进入' : '进入'}</button>
    </form>
  )
}

function Overview({ settings }: { settings: Settings }) {
  const today = useToday()
  const from = weekStart(today)
  const to = addDays(from, 6)
  const data = useLiveQuery(async () => {
    const [words, cards, logs, tasks, days] = await Promise.all([
      db.words.toArray(), db.cards.toArray(), db.logs.toArray(),
      db.tasks.where('date').between(from, to, true, true).toArray(),
      db.days.where('date').between(from, to, true, true).toArray(),
    ])
    return { words, cards, logs, tasks, days }
  }, [from, to])
  if (!data) return null
  const { words, cards, logs, tasks, days } = data
  const week = weekOf(today, settings.startDate)
  const cardOf = new Map(cards.map((c) => [c.wordId, c]))
  const wordOf = new Map(words.map((w) => [w.id!, w]))

  const boxes = Array<number>(7).fill(0)
  let known = 0
  for (const w of words) {
    const c = cardOf.get(w.id!)
    if (c?.known) known++
    else boxes[c?.box ?? 0]++
  }
  const max = Math.max(1, known, ...boxes)

  // 最常错的词直接从复习记录统计，保证和记录一致
  const misses = new Map<number, number>()
  for (const l of logs) if (!l.correct && wordOf.has(l.wordId)) misses.set(l.wordId, (misses.get(l.wordId) ?? 0) + 1)
  const hardest = [...misses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)

  const doneDays = days.filter((d) => d.sticker).length
  const minutes = tasks.filter((t) => t.done).reduce((s, t) => s + t.minutes, 0)
  const weekLogs = logs.filter((l) => l.date >= from && l.date <= to)
  const newThisWeek = new Set(weekLogs.filter((l) => l.boxBefore === 0).map((l) => l.wordId)).size

  // 连续两天只做了最小任务 → 建议把新词量降到 5
  const minimalDone = new Set(tasks.filter((t) => t.done && t.minimal && t.type === 'words').map((t) => t.date))
  const twoMinimal = [...minimalDone].some((d) => minimalDone.has(addDays(d, 1)))

  return (
    <div className="stack">
      <p className="zh">第 {week} 周 · {WEEKS[week - 1].topicZh}（{from} 至 {to}）</p>
      <div className="stats">
        <div className="stat"><b>{doneDays}</b>本周完成天数</div>
        <div className="stat"><b>{minutes}</b>本周学习分钟</div>
        <div className="stat"><b>{weekLogs.length}</b>本周答题次数</div>
        <div className="stat"><b>{newThisWeek}</b>本周新学的词</div>
      </div>
      {twoMinimal && settings.newPerDay > 5 && (
        <div className="card sun">
          这周有连续两天只做了最小任务。按计划可以把每日新词量降到 5 个。
          <div style={{ marginTop: 10 }}><button className="btn" onClick={() => saveSettings({ newPerDay: 5 })}>改为每天 5 个</button></div>
        </div>
      )}
      <div className="card stack">
        <h2>各熟练度的词数 <span className="note">共 {words.length} 个词</span></h2>
        <div className="bars">
          {boxes.map((n, i) => (
            <div className="bar" key={i}>
              <span>{i === 0 ? '未学' : `第 ${i} 级`}</span>
              <i style={{ width: `${(n / max) * 100}%` }} />
              <span>{n}</span>
            </div>
          ))}
          <div className="bar"><span>已掌握</span><i style={{ width: `${(known / max) * 100}%` }} /><span>{known}</span></div>
        </div>
      </div>
      <div className="card stack">
        <h2>最常错的 20 个词</h2>
        {hardest.length === 0 ? <p className="zh">还没有记录。</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>单词</th><th>释义</th><th>答错次数</th><th>当前级别</th></tr></thead>
              <tbody>
                {hardest.map(([id, n]) => (
                  <tr key={id}><td>{wordOf.get(id)!.word}</td><td>{wordOf.get(id)!.meaningZh}</td><td>{n}</td><td>{cardOf.get(id)?.box ?? 0}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">这些数字只在家长面板显示，孩子的界面上看不到。</p>
      </div>
    </div>
  )
}

function WordList() {
  const today = useToday()
  const words = useLiveQuery(() => db.words.orderBy('week').toArray(), [])
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  const [topic, setTopic] = useState('')
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [msgs, setMsgs] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const topics = useMemo(() => [...new Set((words ?? []).map((w) => w.topic))].sort(), [words])
  if (!words || !cards) return null
  const cardOf = new Map(cards.map((c) => [c.wordId, c]))
  const shown = topic ? words.filter((w) => w.topic === topic) : words
  const shownIds = shown.map((w) => w.id!)
  const picked = shownIds.filter((id) => sel.has(id))
  const allPicked = shown.length > 0 && picked.length === shown.length

  const load = async (text: string) => {
    const { words: parsed, errors } = parseWordCsv(text)
    const out = [...errors]
    if (parsed.length) {
      const { added, updated } = await importWords(parsed)
      out.unshift(`导入完成：新增 ${added} 个，更新 ${updated} 个。`)
    }
    setMsgs(out)
  }
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <div className="stack">
      <div className="card stack">
        <h2>导入词表</h2>
        <p className="note">CSV 列顺序：word, pos, meaning_zh, example_en, topic, week, need_spelling。重复导入只更新内容，不影响学习进度。</p>
        <div className="row">
          <input
            ref={fileRef} type="file" accept=".csv,text/csv" hidden
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) await load(await f.text()); e.target.value = '' }}
          />
          <button className="btn" onClick={() => fileRef.current?.click()}>上传 CSV</button>
          <button className="btn ghost" onClick={async () => load(await (await fetch('pet-words.csv')).text())}>载入 12 周词表（384 词）</button>
          <button className="btn quiet" onClick={async () => load(await (await fetch('sample-words.csv')).text())}>载入 20 词示例</button>
        </div>
        {msgs.map((m, i) => <p key={i} className={i ? 'note' : ''}>{m}</p>)}
      </div>

      <div className="card stack">
        <div className="row spread">
          <h2>词表 <span className="note">{shown.length} 个</span></h2>
          <select className="field" style={{ width: 'auto' }} value={topic} onChange={(e) => { setTopic(e.target.value); setSel(new Set()) }} aria-label="按主题筛选">
            <option value="">全部主题</option>
            {topics.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="row">
          <button className="btn" disabled={!picked.length} onClick={async () => { await setKnown(picked, true, today); setSel(new Set()) }}>标为已掌握（{picked.length}）</button>
          <button className="btn ghost" disabled={!picked.length} onClick={async () => { await setKnown(picked, false, today); setSel(new Set()) }}>取消已掌握</button>
          <button className="btn quiet" disabled={!picked.length} onClick={async () => { if (confirm(`删除选中的 ${picked.length} 个词及其学习进度？`)) { await deleteWords(picked); setSel(new Set()) } }}>删除</button>
        </div>
        <p className="note">已掌握的词不再出现在每日练习里，只在一个月后抽查一次。</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="全选" checked={allPicked} onChange={() => setSel(allPicked ? new Set() : new Set(shownIds))} /></th>
                <th>单词</th><th>释义</th><th>主题</th><th>周</th><th>需要拼写</th><th>状态</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((w) => {
                const c = cardOf.get(w.id!)
                return (
                  <tr key={w.id}>
                    <td><input type="checkbox" aria-label={`选择 ${w.word}`} checked={sel.has(w.id!)} onChange={() => toggle(w.id!)} /></td>
                    <td><b>{w.word}</b> <span className="note">{w.pos}</span></td>
                    <td>{w.meaningZh}</td>
                    <td>{w.topic}</td>
                    <td>{w.week}</td>
                    <td><input type="checkbox" aria-label={`${w.word} 需要拼写`} checked={w.needSpelling} onChange={(e) => db.words.update(w.id!, { needSpelling: e.target.checked })} /></td>
                    <td>{c?.known ? '已掌握' : c?.box ? `第 ${c.box} 级` : '未学'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Records() {
  const recordings = useLiveQuery(() => db.recordings.orderBy('date').reverse().toArray(), [])
  const writings = useLiveQuery(() => db.writings.orderBy('date').reverse().toArray(), [])
  return (
    <div className="stack">
      <h2>作文 <span className="note">{writings?.length ?? 0} 篇</span></h2>
      <p className="note">反馈建议：先说 2 个写得好的地方，只指出 1 个要改的地方。</p>
      {writings?.map((w) => (
        <details key={w.id} className="card">
          <summary>{w.date} · 第 {w.week} 周 · {w.wordCount} 词</summary>
          <div className="stack">
            <p className="note">{w.prompt}</p>
            <p className="pre">{w.text}</p>
            {w.aiFeedback && <FeedbackCard fb={w.aiFeedback} />}
          </div>
        </details>
      ))}
      <h2>录音 <span className="note">{recordings?.length ?? 0} 段</span></h2>
      {recordings?.map((r) => (
        <div key={r.id} className="card stack">
          <div className="row spread">
            <b>{r.date} · 第 {r.week} 周 · {r.part}</b>
            <button className="btn quiet" onClick={() => { if (confirm('删除这段录音？')) void db.recordings.delete(r.id!) }}>删除</button>
          </div>
          <p className="note">{r.prompt}</p>
          <AudioPlayer blob={r.blob} />
        </div>
      ))}
    </div>
  )
}

function SettingsTab({ settings }: { settings: Settings }) {
  const [msg, setMsg] = useState('')
  const [pw, setPw] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const download = async () => {
    const blob = new Blob([await exportAll()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hulu-pet-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="stack">
      <div className="card stack">
        <h2>学习计划</h2>
        <label className="stack">
          <span>起始日期（第 1 周的周一）</span>
          <input className="field" type="date" value={settings.startDate} onChange={(e) => { if (isValidDate(e.target.value)) void saveSettings({ startDate: e.target.value }) }} />
        </label>
        <div className="stack">
          <span>每日新词量：<b>{settings.newPerDay}</b> 个</span>
          <div className="row">
            {[8, 5, 3].map((n) => (
              <button key={n} className={`tab ${settings.newPerDay === n ? 'on' : ''}`} onClick={() => saveSettings({ newPerDay: n })}>{n} 个</button>
            ))}
          </div>
          <p className="note">最小任务日不学新词；第 9 周起自动不超过 5 个。每天最多复习 40 个到期词，多出的顺延。</p>
        </div>
      </div>

      <div className="card stack">
        <h2>AI 作文反馈</h2>
        <label className="check">
          <input type="checkbox" checked={settings.aiEnabled} onChange={(e) => saveSettings({ aiEnabled: e.target.checked })} />
          <span>开启（作文页出现「Feedback」按钮）</span>
        </label>
        <input
          className="field" type="password" placeholder="Anthropic API 密钥（sk-ant-…）" aria-label="API 密钥" autoComplete="off"
          value={settings.aiKey} onChange={(e) => saveSettings({ aiKey: e.target.value.trim() })}
        />
        <p className="note">
          开启后，孩子点「Feedback」时会把作文题目和正文发送给 Anthropic 的接口，返回 2 条优点和 1 条建议；这是本工具唯一的对外请求，关闭后不发送任何内容。
          密钥只保存在这台设备的浏览器里，不进备份文件；能打开这台设备浏览器的人可以读到它，建议单独建一个限额较低的密钥。
        </p>
      </div>

      <div className="card stack">
        <h2>备份</h2>
        <p className="note">所有数据只保存在这台设备的浏览器里。换设备或清理浏览器前，请先导出。备份文件包含录音和作文，不含 API 密钥。</p>
        <div className="row">
          <button className="btn" onClick={download}>导出 JSON</button>
          <input
            ref={importRef} type="file" accept=".json,application/json" hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f || !confirm('导入会替换这台设备上现有的全部数据，确定吗？')) return
              try { await importAll(await f.text()); setMsg('导入完成。') } catch (err) { setMsg(err instanceof Error ? err.message : '导入失败') }
            }}
          />
          <button className="btn ghost" onClick={() => importRef.current?.click()}>导入 JSON</button>
        </div>
      </div>

      <div className="card stack">
        <h2>修改家长密码</h2>
        <div className="row">
          <input className="field grow" style={{ width: 'auto' }} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="新密码（至少 4 位）" aria-label="新密码" />
          <button className="btn" disabled={pw.length < 4} onClick={async () => { await saveSettings({ passHash: await hashPassword(pw) }); setPw(''); setMsg('密码已修改。') }}>保存</button>
        </div>
      </div>
      {msg && <div className="card done">{msg}</div>}
    </div>
  )
}
