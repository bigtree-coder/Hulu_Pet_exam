/** 家长密码只存哈希。非 https 环境没有 crypto.subtle，退回简单哈希（防孩子误入，不防攻击）。 */
export async function hashPassword(pw: string): Promise<string> {
  const text = `hulu-pet:${pw}`
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return 's:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return 'd:' + (h >>> 0).toString(16)
}

export async function checkPassword(pw: string, stored: string): Promise<boolean> {
  if (stored.startsWith('d:')) {
    let h = 5381
    const text = `hulu-pet:${pw}`
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
    return stored === 'd:' + (h >>> 0).toString(16)
  }
  return (await hashPassword(pw)) === stored
}
