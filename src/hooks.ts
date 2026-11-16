import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { todayStr } from './lib/dates'
import { db, DEFAULT_SETTINGS } from './lib/db'
import type { Settings } from './lib/types'

/** 今天的日期；应用回到前台或过了午夜时自动更新 */
export function useToday(): string {
  const [today, setToday] = useState(todayStr())
  useEffect(() => {
    const tick = () => setToday(todayStr())
    const id = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [])
  return today
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...(await db.settings.get('main')) }), [])
}

export function useHash(): string {
  const get = () => window.location.hash.replace(/^#\/?/, '') || 'today'
  const [hash, setHash] = useState(get)
  useEffect(() => {
    const on = () => setHash(get())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export const go = (page: string) => { window.location.hash = `#/${page}` }

/** 把 Blob 变成可播放的地址，卸载时释放 */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) { setUrl(undefined); return }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}
