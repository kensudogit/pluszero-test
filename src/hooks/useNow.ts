import { useEffect, useState } from 'react'

/** 経過時間表示用。アニメーション軽減設定では更新間隔を長くします。 */
export function useNow(baseIntervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null
    const reduced = mq?.matches ?? false
    const intervalMs = reduced ? Math.max(baseIntervalMs, 60000) : baseIntervalMs

    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [baseIntervalMs])

  return now
}
