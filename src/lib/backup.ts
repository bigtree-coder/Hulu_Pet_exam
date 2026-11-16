import { db as defaultDb, type PetDB } from './db'
import type { Recording, Settings } from './types'

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

function dataUrlToBlob(url: string): Blob {
  const [head, body] = url.split(',')
  const mime = /data:([^;]*)/.exec(head)?.[1] || 'audio/webm'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const TABLES = ['words', 'cards', 'logs', 'tasks', 'days', 'writings', 'settings'] as const

export async function exportAll(db: PetDB = defaultDb): Promise<string> {
  const out: Record<string, unknown> = { app: 'hulu-pet', version: 1, exportedAt: new Date().toISOString() }
  for (const t of TABLES) out[t] = await db.table(t).toArray()
  // API 密钥不进备份文件
  out.settings = (out.settings as Settings[]).map((s) => ({ ...s, aiKey: '' }))
  out.recordings = await Promise.all(
    (await db.recordings.toArray()).map(async (r) => ({ ...r, blob: await blobToDataUrl(r.blob) })),
  )
  return JSON.stringify(out)
}

/** 用备份文件整体替换本地数据 */
export async function importAll(json: string, db: PetDB = defaultDb): Promise<void> {
  const data = JSON.parse(json)
  if (data?.app !== 'hulu-pet' || !Array.isArray(data.words)) throw new Error('这不是本工具导出的备份文件')
  const recordings: Recording[] = (data.recordings ?? []).map((r: Recording & { blob: string }) => ({ ...r, blob: dataUrlToBlob(r.blob) }))
  await db.transaction('rw', db.tables, async () => {
    const aiKey = (await db.settings.get('main'))?.aiKey ?? ''
    for (const t of TABLES) {
      await db.table(t).clear()
      await db.table(t).bulkPut(data[t] ?? [])
    }
    await db.settings.update('main', { aiKey })
    await db.recordings.clear()
    await db.recordings.bulkPut(recordings)
  })
}
