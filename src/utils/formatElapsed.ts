/** 経過時間を読みやすい日本語表記にします（プレゼン・オペ監視向け）。 */
export function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  if (hr > 0) return `${hr}時間${min % 60}分`
  if (min > 0) return `${min}分${sec % 60}秒`
  return `${sec}秒`
}

/** リードタイムの平均などに使う短い表記 */
export function formatElapsedShort(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  if (min >= 60) {
    const h = Math.floor(min / 60)
    return `${h}時間${min % 60}分`
  }
  if (min > 0) return `${min}分${sec % 60}秒`
  return `${sec}秒`
}
