import { useCallback, useState } from 'react'
import { STORE_LOCATION, buildTelUri } from '../config/storeLocation'

export function CallDeskPage() {
  const telUri = buildTelUri()
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle')

  const copyNumber = useCallback(async () => {
    const text = STORE_LOCATION.phoneDisplay
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopyState('ok')
      window.setTimeout(() => setCopyState('idle'), 2500)
    } catch {
      setCopyState('err')
      window.setTimeout(() => setCopyState('idle'), 3500)
    }
  }, [])

  return (
    <div className="panel call-desk-panel">
      <header className="panel-head call-desk-head">
        <div>
          <h2>店舗への通話（発信）</h2>
          <p className="panel-lead">
            スマートフォンや電話機能付きタブレットでは、下のボタンから OS
            の電話アプリを起動して発信できます。ブラウザ単体で音声を中継するものではありません。
          </p>
        </div>
      </header>

      <section className="call-desk-card" aria-labelledby="call-number-title">
        <h3 id="call-number-title" className="call-desk-subtitle">
          店舗代表電話
        </h3>
        <p className="call-desk-number" aria-live="polite">
          {STORE_LOCATION.phoneDisplay}
        </p>
        <p className="muted call-desk-hours">{STORE_LOCATION.phoneHours}</p>

        <div className="call-desk-actions">
          <a className="btn accent wide call-dial" href={telUri}>
            電話アプリで発信
          </a>
          <button type="button" className="btn ghost wide" onClick={copyNumber}>
            表示番号をコピー
          </button>
        </div>

        {copyState === 'ok' ? (
          <p className="call-toast ok" role="status">
            クリップボードにコピーしました。PC の場合は通常の電話から手入力してください。
          </p>
        ) : null}
        {copyState === 'err' ? (
          <p className="call-toast err" role="alert">
            コピーに失敗しました。番号を手入力してください。
          </p>
        ) : null}

        <p className="muted call-desk-note">
          <strong>デモ環境:</strong> 電話番号は架空です。本番では店舗マスタ・
          <code>tel:</code> 用 E.164 を登録します。PC ブラウザでは <code>tel:</code>{' '}
          リンクが動かないことがあります。
        </p>
      </section>

      <section className="call-desk-card call-desk-card--mute" aria-label="実装の補足">
        <h3 className="call-desk-subtitle">本番で想定できる拡張</h3>
        <ul className="call-desk-list">
          <li>クラウド PBX・CTI と連携したクリックコール／着信ポップアップ</li>
          <li>WebRTC＋シグナリングサーバによるブラウザ内音声（スタッフ内線・サポート）</li>
          <li>SIP・社内電話網との連携、録音・監査ログ</li>
        </ul>
      </section>
    </div>
  )
}
