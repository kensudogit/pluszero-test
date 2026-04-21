import { useState } from 'react'
import './App.css'
import { OrderStoreProvider } from './context/OrderStore'
import { CustomerOrder } from './components/CustomerOrder'
import { KitchenBoard } from './components/KitchenBoard'
import { PersistErrorBanner } from './components/PersistErrorBanner'
import { AnalyticsPage } from './components/AnalyticsPage'
import { StoreMapPage } from './components/StoreMapPage'
import { CallDeskPage } from './components/CallDeskPage'
import { OperationsPage } from './components/OperationsPage'

type Screen = 'customer' | 'kitchen' | 'analytics' | 'map' | 'call' | 'ops'

const DEMO_BUILD = 'demo 0.9'

function tabIdForScreen(s: Screen): string {
  if (s === 'customer') return 'tab-customer'
  if (s === 'kitchen') return 'tab-kitchen'
  if (s === 'analytics') return 'tab-analytics'
  if (s === 'map') return 'tab-map'
  if (s === 'call') return 'tab-call'
  return 'tab-ops'
}

function RestaurantDemo() {
  const [screen, setScreen] = useState<Screen>('customer')

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <div className="brand-row">
              <p className="brand-title">店内オーダー・プロトタイプ</p>
              <span className="proto-badge" title="対外向けプレゼン用の対話型モックです">
                {DEMO_BUILD}
              </span>
            </div>
            <p className="brand-sub">
              スマホ・タブレット・PC 対応のローカルデモ（外部API・決済・認証なし）。データはこのブラウザに保存されます。
            </p>
          </div>
        </div>
        <nav className="tabs" aria-label="主要画面切替" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={screen === 'customer'}
            id="tab-customer"
            className={screen === 'customer' ? 'tab active' : 'tab'}
            onClick={() => setScreen('customer')}
          >
            お客様（テーブル）
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={screen === 'kitchen'}
            id="tab-kitchen"
            className={screen === 'kitchen' ? 'tab active' : 'tab'}
            onClick={() => setScreen('kitchen')}
          >
            キッチン
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={screen === 'analytics'}
            id="tab-analytics"
            className={screen === 'analytics' ? 'tab active' : 'tab'}
            onClick={() => setScreen('analytics')}
          >
            集計・分析
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={screen === 'map'}
            id="tab-map"
            className={screen === 'map' ? 'tab active' : 'tab'}
            onClick={() => setScreen('map')}
          >
            地図・アクセス
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={screen === 'call'}
            id="tab-call"
            className={screen === 'call' ? 'tab active' : 'tab'}
            onClick={() => setScreen('call')}
          >
            通話・連絡
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={screen === 'ops'}
            id="tab-ops"
            className={screen === 'ops' ? 'tab active' : 'tab'}
            onClick={() => setScreen('ops')}
          >
            運用・本番
          </button>
        </nav>
      </header>

      <PersistErrorBanner />

      <main
        className="main"
        role="tabpanel"
        aria-labelledby={tabIdForScreen(screen)}
      >
        {screen === 'customer' ? (
          <CustomerOrder />
        ) : screen === 'kitchen' ? (
          <KitchenBoard />
        ) : screen === 'analytics' ? (
          <AnalyticsPage />
        ) : screen === 'map' ? (
          <StoreMapPage />
        ) : screen === 'call' ? (
          <CallDeskPage />
        ) : (
          <OperationsPage />
        )}
      </main>

      <footer className="foot-note foot-note--columns">
        <div>
          <p className="foot-heading">本番に向けた設計余地（例）</p>
          <ul className="foot-list">
            <li>端末認証・スタッフ権限・監査ログ・オフライン耐性</li>
            <li>リアルタイム同期（WebSocket / SSE）とキッチン優先ルール</li>
            <li>メニューCMS・売上レポ・既存POSとの連携要件の整理</li>
          </ul>
          <button type="button" className="foot-ops-link" onClick={() => setScreen('ops')}>
            運用・本番タブで監査ログ・API ヘルス・チェックリストを開く
          </button>
        </div>
        <p className="foot-meta">
          画面上の計測値・リードタイムはブラウザ内セッションのサンプルです。契約後の要件定義で閾値・項目を確定できます。
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <OrderStoreProvider>
      <RestaurantDemo />
    </OrderStoreProvider>
  )
}
