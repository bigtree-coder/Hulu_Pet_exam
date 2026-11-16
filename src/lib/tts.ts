export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function britishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === 'en-GB' && v.localService) ?? voices.find((v) => v.lang.replace('_', '-') === 'en-GB')
}

/** 英式发音朗读；浏览器不支持时静默忽略 */
export function speak(text: string): void {
  if (!canSpeak()) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-GB'
  const v = britishVoice()
  if (v) u.voice = v
  u.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}
