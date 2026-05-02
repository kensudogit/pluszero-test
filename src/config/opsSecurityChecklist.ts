/**
 * 運用・セキュリティチェックリスト（要件たたき台）。
 * チェック状態はブラウザの localStorage に保存する。
 */
export const OPS_CHECKLIST_STORAGE_KEY = 'pz-instore-ops-checklist-v1'

export type OpsChecklistSection = {
  id: string
  title: string
  items: { id: string; label: string }[]
}

export const OPS_SECURITY_CHECKLIST: OpsChecklistSection[] = [
  {
    id: 'auth',
    title: '認証（OIDC / セッション）と端末紐付け・スタッフ RBAC',
    items: [
      { id: 'auth_oidc', label: 'IdP・OIDC（またはセッション）方式と秘密情報のローテーション方針を決めた' },
      { id: 'auth_device', label: 'キッチン／ホール端末の登録・紐付け（証明書・デバイス ID 等）を定義した' },
      { id: 'auth_rbac', label: 'スタッフロールと権限マトリクス（注文・キッチン・設定・監査参照）を文書化した' },
      { id: 'auth_session', label: 'セッション有効期限・再認証・端末紛失時の失効手順を決めた' },
    ],
  },
  {
    id: 'audit',
    title: '監査ログのサーバ永続化・改ざん耐性・保全期間',
    items: [
      { id: 'audit_server', label: '監査イベントをサーバに集約し、クライアントのみに依存しないようにした' },
      { id: 'audit_tamper', label: '改ざん検知（署名・ハッシュチェーン・WORM 等）の要否と方式を検討した' },
      { id: 'audit_retention', label: '保全期間・削除／匿名化ポリシーと法的要件を整理した' },
      { id: 'audit_access', label: '監査ログ参照権限とエクスポート手順を RBAC と合わせて定義した' },
    ],
  },
  {
    id: 'sync',
    title: 'リアルタイム同期（WebSocket / SSE）、オフラインキュー・コンフリクト解決',
    items: [
      { id: 'sync_channel', label: 'WebSocket / SSE 等のチャネル設計・再接続・心拍を定義した' },
      { id: 'sync_offline', label: 'オフライン時のキューイング・リトライ・上限を決めた' },
      { id: 'sync_conflict', label: '同時編集・ステータス競合時の解決ルール（優先・マージ）を決めた' },
      { id: 'sync_backpressure', label: '負荷時のバックプレッシャー（クライアント抑制）を検討した' },
    ],
  },
  {
    id: 'api',
    title: 'メニュー CMS・レート制限・API のスロットリング／バックオフ',
    items: [
      { id: 'cms_workflow', label: 'メニュー CMS の公開フロー・承認・ロールバックを定義した' },
      { id: 'api_rate', label: 'API ゲートウェイまたはサーバ側のレート制限・クォータを設定した' },
      { id: 'api_backoff', label: 'クライアントの指数バックオフ・ジッター・サーキットブレーカーを実装方針に含めた' },
      { id: 'api_version', label: 'API バージョニングと破壊的変更の告知プロセスを決めた' },
    ],
  },
  {
    id: 'security',
    title: '個人情報最小化・TLS・CSP・ログマスキング',
    items: [
      { id: 'privacy_min', label: '取得する個人情報を最小化し、目的・保管・第三者提供を整理した' },
      { id: 'tls_hsts', label: 'TLS 設定（プロトコル・暗号スイート）と HSTS を運用要件に含めた' },
      { id: 'csp_headers', label: 'CSP・その他セキュリティヘッダーをアプリに適用した' },
      { id: 'log_mask', label: 'ログ・監査出力からトークン・電話番号等をマスキングするルールを決めた' },
    ],
  },
  {
    id: 'integration',
    title: 'POS／会計／在庫との連携インタフェース策定',
    items: [
      { id: 'pos_spec', label: 'POS／会計／在庫との I/F 仕様（イベント・マスタ同期・エラーコード）を文書化した' },
      { id: 'pos_recovery', label: '連携障害時のリカバリ・手動介入・再送ポリシーを決めた' },
      { id: 'pos_master', label: 'メニュー・価格・在庫マスタの同期頻度と真実の情報源（SoT）を決めた' },
      { id: 'pos_test', label: '結合試験・ステージング環境での検証シナリオを用意した' },
    ],
  },
]

export function getTotalChecklistLeafCount(): number {
  return OPS_SECURITY_CHECKLIST.reduce((n, s) => n + s.items.length, 0)
}

export function countCheckedLeaves(state: Record<string, boolean>): number {
  let n = 0
  for (const sec of OPS_SECURITY_CHECKLIST) {
    for (const it of sec.items) {
      if (state[it.id]) n += 1
    }
  }
  return n
}

export function loadOpsChecklistState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(OPS_CHECKLIST_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === true) out[k] = true
    }
    return out
  } catch {
    return {}
  }
}

export function saveOpsChecklistState(state: Record<string, boolean>): void {
  try {
    localStorage.setItem(OPS_CHECKLIST_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota */
  }
}

export function clearOpsChecklistState(): void {
  try {
    localStorage.removeItem(OPS_CHECKLIST_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
