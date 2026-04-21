import { useCallback, useEffect, useState } from 'react'
import { readAuditLog, clearAuditLog, type AuditEvent } from '../audit/auditLog'
import { getRuntimeFlags, saveRuntimeFlags, resetRuntimeFlagsToDefaults, type RuntimeFlags } from '../config/runtimeConfig'
import { probeApiHealth } from '../services/apiClient'

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function formatTs(ts: number) {
  return new Date(ts).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function typeLabel(t: AuditEvent['type']) {
  if (t === 'order.created') return '注文作成'
  if (t === 'order.status') return 'ステータス変更'
  return '全消去'
}

export function OperationsPage() {
  const online = useOnline()
  const [flags, setFlags] = useState<RuntimeFlags>(() => getRuntimeFlags())
  const [draftApi, setDraftApi] = useState(flags.apiBaseUrl)
  const [draftSync, setDraftSync] = useState(flags.syncMode)
  const [draftAudit, setDraftAudit] = useState(flags.auditEnabled)

  const [audit, setAudit] = useState<AuditEvent[]>(() => readAuditLog())
  const [storageEst, setStorageEst] = useState<{ used?: number; quota?: number }>({})
  const [health, setHealth] = useState<{ loading: boolean; msg: string; ok?: boolean }>({
    loading: false,
    msg: '',
  })

  const refreshAudit = useCallback(() => setAudit(readAuditLog()), [])

  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'visible') refreshAudit()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refreshAudit])

  useEffect(() => {
    let cancelled = false
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((e) => {
        if (!cancelled) setStorageEst({ used: e.usage ?? undefined, quota: e.quota ?? undefined })
      })
    }
    return () => {
      cancelled = true
    }
  }, [])

  function applyFlags() {
    const next = saveRuntimeFlags({
      apiBaseUrl: draftApi.trim(),
      syncMode: draftSync,
      auditEnabled: draftAudit,
    })
    setFlags(next)
  }

  function defaultsFlags() {
    const next = resetRuntimeFlagsToDefaults()
    setFlags(next)
    setDraftApi(next.apiBaseUrl)
    setDraftSync(next.syncMode)
    setDraftAudit(next.auditEnabled)
  }

  async function runHealth() {
    setHealth({ loading: true, msg: '確認中…' })
    const r = await probeApiHealth()
    setHealth({
      loading: false,
      msg: r.ms != null ? `${r.message}（${r.ms} ms）` : r.message,
      ok: r.ok,
    })
  }

  function formatBytes(n?: number) {
    if (n == null || !Number.isFinite(n)) return '—'
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="panel ops-panel">
      <header className="panel-head ops-head">
        <div>
          <h2>運用・本番準備</h2>
          <p className="panel-lead">
            監査ログ・ランタイム設定・API 接続スタブをまとめました。本番では認証・RBAC・監査の永続化・WSS
            同期・CMS をバックエンドと接続します。
          </p>
        </div>
      </header>

      <section className="ops-card" aria-label="健全性">
        <h3 className="ops-section-title">ランタイム健全性</h3>
        <div className="ops-health-grid">
          <div className="ops-health-pill">
            <span className="ops-health-label">ネットワーク</span>
            <span className={online ? 'ops-health-val ok' : 'ops-health-val ng'}>
              {online ? 'オンライン' : 'オフライン'}
            </span>
          </div>
          <div className="ops-health-pill">
            <span className="ops-health-label">同期モード（設定）</span>
            <span className="ops-health-val">{flags.syncMode === 'local' ? 'ローカルのみ' : 'API 置換前提'}</span>
          </div>
          <div className="ops-health-pill">
            <span className="ops-health-label">ストレージ使用（概算）</span>
            <span className="ops-health-val">
              {formatBytes(storageEst.used)} / {formatBytes(storageEst.quota)}
            </span>
          </div>
        </div>
      </section>

      <section className="ops-card" aria-label="ランタイム設定">
        <h3 className="ops-section-title">ランタイム設定（ブラウザに保存）</h3>
        <p className="muted ops-hint">
          <code>VITE_API_BASE_URL</code> をビルド時に渡すか、下記で上書きできます。同期モードは UI
          表示用です（デモの注文保存は引き続き localStorage です）。
        </p>
        <div className="ops-form">
          <label className="field">
            <span className="field-label">API Base URL</span>
            <input
              className="input"
              value={draftApi}
              onChange={(e) => setDraftApi(e.target.value)}
              placeholder="https://api.example.com"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span className="field-label">同期モード（設計メモ）</span>
            <select
              className="input"
              value={draftSync}
              onChange={(e) => setDraftSync(e.target.value === 'api_stub' ? 'api_stub' : 'local')}
            >
              <option value="local">local — ローカル永続化のみ</option>
              <option value="api_stub">api_stub — REST 置き換えを想定</option>
            </select>
          </label>
          <label className="field ops-checkbox">
            <input
              type="checkbox"
              checked={draftAudit}
              onChange={(e) => setDraftAudit(e.target.checked)}
            />
            <span>監査ログを記録する（OrderStore のイベント）</span>
          </label>
          <div className="ops-form-actions">
            <button type="button" className="btn primary" onClick={applyFlags}>
              設定を保存
            </button>
            <button type="button" className="btn ghost" onClick={defaultsFlags}>
              既定に戻す
            </button>
          </div>
        </div>

        <div className="ops-api-probe">
          <p className="ops-section-sub">API ヘルス（スタブ）</p>
          <button type="button" className="btn ghost btn-compact" disabled={health.loading} onClick={runHealth}>
            {health.loading ? '確認中…' : '/health を試行'}
          </button>
          {health.msg ? (
            <p className={`ops-probe-result ${health.ok === true ? 'ok' : health.ok === false ? 'ng' : ''}`}>
              {health.msg}
            </p>
          ) : null}
        </div>
      </section>

      <section className="ops-card" aria-label="監査ログ">
        <div className="ops-audit-toolbar">
          <h3 className="ops-section-title">監査ログ（最新 {audit.length} 件・最大200件）</h3>
          <div className="ops-audit-buttons">
            <button type="button" className="btn ghost btn-compact" onClick={refreshAudit}>
              再読込
            </button>
            <button
              type="button"
              className="btn ghost danger btn-compact"
              onClick={() => {
                clearAuditLog()
                refreshAudit()
              }}
            >
              ログを消去
            </button>
          </div>
        </div>
        {audit.length === 0 ? (
          <p className="muted">イベントはまだありません。注文・キッチン操作後に記録されます。</p>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th scope="col">時刻</th>
                  <th scope="col">種別</th>
                  <th scope="col">注文ID</th>
                  <th scope="col">詳細</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((e) => (
                  <tr key={e.id}>
                    <td>{formatTs(e.ts)}</td>
                    <td>{typeLabel(e.type)}</td>
                    <td>
                      <code className="ops-code">{e.orderId ?? '—'}</code>
                    </td>
                    <td>{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ops-card ops-card--collapse">
        <details className="ops-details">
          <summary className="ops-details-summary">本番での拡張チェックリスト（要件のたたき台）</summary>
          <ul className="ops-checklist">
            <li>認証（OIDC / セッション）と端末紐付け・スタッフ RBAC</li>
            <li>監査ログのサーバ永続化・改ざん耐性・保全期間</li>
            <li>リアルタイム同期（WebSocket / SSE）、オフラインキュー・コンフリクト解決</li>
            <li>メニュー CMS・レート制限・API のスロットリング／バックオフ</li>
            <li>個人情報最小化・TLS・CSP・ログマスキング</li>
            <li>POS／会計／在庫との連携インタフェース策定</li>
          </ul>
        </details>
      </section>
    </div>
  )
}
