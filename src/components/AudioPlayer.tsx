import { useEffect, useRef, useState } from 'react'
import { useObjectUrl } from '../hooks'

const PLAY_EVENT = 'hulu:audio-play'

/** 家长面板用：浏览器自带控件 */
export function NativePlayer({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob)
  return url ? <audio controls preload="metadata" src={url} /> : null
}

/**
 * 孩子界面用的播放器：播放/暂停、后退 5 秒、可拖动的进度条。
 * 不显示任何时间数字——iPad Safari 自带控件会显示剩余时间，等于倒计时。
 * 同一页面上一个开始播放，其他的自动暂停。
 */
export function KidPlayer({ blob, label, fallbackSeconds }: { blob: Blob; label?: string; fallbackSeconds?: number }) {
  const url = useObjectUrl(blob)
  const ref = useRef<HTMLAudioElement>(null)
  const me = useRef(Symbol('player'))
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onOther = (e: Event) => { if ((e as CustomEvent).detail !== me.current) ref.current?.pause() }
    window.addEventListener(PLAY_EVENT, onOther)
    return () => window.removeEventListener(PLAY_EVENT, onOther)
  }, [])

  // 刚录的 webm 在 Chrome 里 duration 是 Infinity，用录音时记下的秒数兜底
  const duration = () => {
    const d = ref.current?.duration ?? NaN
    return Number.isFinite(d) && d > 0 ? d : fallbackSeconds || 0
  }
  const toggle = () => {
    const a = ref.current
    if (!a) return
    if (a.paused) a.play().catch(() => setFailed(true))
    else a.pause()
  }
  const back = () => { const a = ref.current; if (a) a.currentTime = Math.max(0, a.currentTime - 5) }
  const seek = (v: number) => {
    const a = ref.current
    const d = duration()
    if (a && d) { a.currentTime = (v / 1000) * d; setPos(v) }
  }

  if (failed) {
    return <p className="note">This audio can't play here. 这个音频在这台设备上放不了，请家长换成 MP3 格式。</p>
  }
  return (
    <div className="player">
      {url && (
        <audio
          ref={ref} src={url} preload="metadata"
          onPlay={() => { setPlaying(true); window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: me.current })) }}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setPos(1000) }}
          onTimeUpdate={() => { const d = duration(); if (d) setPos(Math.min(1000, Math.round((ref.current!.currentTime / d) * 1000))) }}
          onError={() => setFailed(true)}
        />
      )}
      <button className="icon-btn" onClick={toggle} aria-label={playing ? `Pause ${label ?? ''}` : `Play ${label ?? ''}`}>
        {playing ? '⏸' : '▶️'}
      </button>
      <input
        className="seek grow" type="range" min={0} max={1000} value={pos}
        onChange={(e) => seek(Number(e.target.value))} aria-label={`Position ${label ?? ''}`}
      />
      <button className="btn quiet" onClick={back} aria-label="Back 5 seconds">↺ 5s</button>
    </div>
  )
}
