import { getRuntimeFlags } from '../config/runtimeConfig'

/** バックエンド向けヘルスチェック（GET {base}/health）。URL 未設定や到達不能時は失敗を返す。 */
export async function probeApiHealth(): Promise<{ ok: boolean; message: string; ms?: number }> {
  const base = getRuntimeFlags().apiBaseUrl.trim().replace(/\/$/, '')
  if (!base) {
    return { ok: false, message: 'API Base URL が未設定です（.env の VITE_API_BASE_URL または運用画面で設定）' }
  }

  const url = `${base}/health`
  const started = performance.now()

  try {
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
    window.clearTimeout(timer)
    const ms = Math.round(performance.now() - started)
    if (res.ok) return { ok: true, message: `HTTP ${res.status}`, ms }
    return { ok: false, message: `HTTP ${res.status}`, ms }
  } catch (e) {
    const ms = Math.round(performance.now() - started)
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return { ok: false, message: msg, ms }
  }
}
