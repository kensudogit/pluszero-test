/**
 * ビルド時の環境変数を既定とし、運用画面からの上書きは localStorage に保存する。
 */
export type SyncMode = 'local' | 'api_stub'

export type RuntimeFlags = {
  /** バックエンド API のベース URL（末尾スラッシュなし想定） */
  apiBaseUrl: string
  /** local: 現状どおりローカルのみ。api_stub: 将来の REST 置き換え前提 */
  syncMode: SyncMode
  /** 監査ログを OrderStore から記録するか */
  auditEnabled: boolean
}

const LS_KEY = 'pz-instore-runtime-v1'

const DEFAULTS: RuntimeFlags = {
  apiBaseUrl: typeof import.meta.env.VITE_API_BASE_URL === 'string' ? import.meta.env.VITE_API_BASE_URL : '',
  syncMode: 'local',
  auditEnabled: true,
}

export function getRuntimeFlags(): RuntimeFlags {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<RuntimeFlags>
    return {
      apiBaseUrl: typeof parsed.apiBaseUrl === 'string' ? parsed.apiBaseUrl : DEFAULTS.apiBaseUrl,
      syncMode: parsed.syncMode === 'api_stub' ? 'api_stub' : 'local',
      auditEnabled: parsed.auditEnabled !== false,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveRuntimeFlags(partial: Partial<RuntimeFlags>): RuntimeFlags {
  const next: RuntimeFlags = {
    ...getRuntimeFlags(),
    ...partial,
    syncMode: partial.syncMode === 'api_stub' || partial.syncMode === 'local' ? partial.syncMode : getRuntimeFlags().syncMode,
  }
  localStorage.setItem(LS_KEY, JSON.stringify(next))
  return next
}

export function resetRuntimeFlagsToDefaults(): RuntimeFlags {
  localStorage.removeItem(LS_KEY)
  return { ...DEFAULTS }
}
