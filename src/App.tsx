import { useState } from 'react'
import './App.css'
import { OrderStoreProvider } from './context/OrderStore'
import { CustomerOrder } from './components/CustomerOrder'
import { KitchenBoard } from './components/KitchenBoard'

type Screen = 'customer' | 'kitchen'

function RestaurantDemo() {
  const [screen, setScreen] = useState<Screen>('customer')

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <p className="brand-title">店内オーダー（画面イメージ）</p>
            <p className="brand-sub">
              デモ・提案用プロトタイプ（PC／店内タブレット幅想定・スマホ専用レイアウトなし）— データはこのブラウザに保存されます
            </p>
          </div>
        </div>
        <nav className="tabs" aria-label="画面切替">
          <button
            type="button"
            className={screen === 'customer' ? 'tab active' : 'tab'}
            onClick={() => setScreen('customer')}
          >
            お客様（テーブル）
          </button>
          <button
            type="button"
            className={screen === 'kitchen' ? 'tab active' : 'tab'}
            onClick={() => setScreen('kitchen')}
          >
            キッチン
          </button>
        </nav>
      </header>

      <main className="main">{screen === 'customer' ? <CustomerOrder /> : <KitchenBoard />}</main>

      <footer className="foot-note">
        <p>
          実運用では卓用タブレットとキッチン用ディスプレイを分け、サーバ経由で同期します。レイアウトや文言はヒアリング後に調整できます。
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
