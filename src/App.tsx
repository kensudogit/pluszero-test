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

const APP_VERSION =
  typeof import.meta.env.VITE_APP_VERSION === 'string' ? import.meta.env.VITE_APP_VERSION.trim() : ''

function tabIdForScreen(s: Screen): string {
  if (s === 'customer') return 'tab-customer'
  if (s === 'kitchen') return 'tab-kitchen'
  if (s === 'analytics') return 'tab-analytics'
  if (s === 'map') return 'tab-map'
  if (s === 'call') return 'tab-call'
  return 'tab-ops'
}

function RestaurantApp() {
  const [screen, setScreen] = useState<Screen>('customer')

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <div className="brand-row">
              <p className="brand-title">店内オーダー</p>
              {APP_VERSION ? (
                <span className="app-version-badge" title="アプリケーション版">
                  v{APP_VERSION}
                </span>
              ) : null}
            </div>
            <p className="brand-sub">
              スマートフォン・タブレット・PC に対応。オーダーは端末のブラウザに保存されます。バックエンド連携時は運用タブの設定に従い API
              へ同期できます。
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
            運用
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
          <p className="foot-heading">運用上の留意点</p>
          <ul className="foot-list">
            <li>端末認証・スタッフ権限・監査ログの保全はバックエンドとポリシーで管理する</li>
            <li>複数端末ではリアルタイム同期（WebSocket 等）とオフライン時の衝突解決が必要</li>
            <li>メニュー・売上レポート・POS 連携は店舗マスタとバックエンド API の仕様に合わせて構成する</li>
          </ul>
          <button type="button" className="foot-ops-link" onClick={() => setScreen('ops')}>
            運用タブで監査ログ・API ヘルス・チェックリストを開く
          </button>
        </div>
        <p className="foot-meta">
          集計・分析の数値はこのブラウザに蓄積されたオーダーに基づきます。閾値や表示項目は要件に合わせて調整してください。
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <OrderStoreProvider>
      <RestaurantApp />
    </OrderStoreProvider>
  )
}
