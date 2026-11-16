// 所有日期用本地时区的 'YYYY-MM-DD' 字符串，字符串比较即日期比较。

const pad = (n: number) => String(n).padStart(2, '0')

export function todayStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toUTC(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = new Date(toUTC(s) + n * 86400000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86400000)
}

/** 0 = 周日 … 6 = 周六 */
export function weekday(s: string): number {
  return new Date(toUTC(s)).getUTCDay()
}

/** 所在周的周一 */
export function weekStart(s: string): string {
  return addDays(s, -((weekday(s) + 6) % 7))
}

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s
}
