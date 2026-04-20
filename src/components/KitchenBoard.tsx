import { useMemo } from 'react'
import type { KitchenOrder, OrderStatus } from '../types/order'
import { useOrderStore } from '../context/OrderStore'

const COLUMNS: { status: OrderStatus; title: string; hint: string }[] = [
  { status: 'new', title: '新規', hint: '調理待ちの注文' },
  { status: 'cooking', title: '調理中', hint: '作成中' },
  { status: 'ready', title: '提供待ち', hint: 'ホールへ渡せる状態' },
]

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function OrderCard({
  order,
  onNext,
}: {
  order: KitchenOrder
  onNext: (next: OrderStatus) => void
}) {
  const total = order.items.reduce((s, l) => s + l.unitPrice * l.qty, 0)
  let primary: string
  let nextStatus: OrderStatus | null = null
  if (order.status === 'new') {
    primary = '調理開始'
    nextStatus = 'cooking'
  } else if (order.status === 'cooking') {
    primary = '出来上がり'
    nextStatus = 'ready'
  } else if (order.status === 'ready') {
    primary = '配膳完了'
    nextStatus = 'done'
  } else {
    primary = ''
    nextStatus = null
  }

  return (
    <article className="order-card">
      <div className="order-card-top">
        <span className="pill table-pill">卓 {order.tableLabel}</span>
        <time className="time" dateTime={new Date(order.createdAt).toISOString()}>
          {formatTime(order.createdAt)}
        </time>
      </div>
      <ul className="order-lines">
        {order.items.map((l) => (
          <li key={l.menuId}>
            <span>
              {l.name} <strong>×{l.qty}</strong>
            </span>
          </li>
        ))}
      </ul>
      {order.note ? <p className="order-note">メモ: {order.note}</p> : null}
      <div className="order-foot">
        <span className="order-sum">¥{total.toLocaleString('ja-JP')}</span>
        {nextStatus ? (
          <button type="button" className="btn primary" onClick={() => onNext(nextStatus)}>
            {primary}
          </button>
        ) : null}
      </div>
    </article>
  )
}

export function KitchenBoard() {
  const { orders, advanceStatus, resetDemo } = useOrderStore()

  const byStatus = useMemo(() => {
    const map: Record<OrderStatus, KitchenOrder[]> = {
      new: [],
      cooking: [],
      ready: [],
      done: [],
    }
    for (const o of orders) {
      map[o.status].push(o)
    }
    const sortFn = (a: KitchenOrder, b: KitchenOrder) => a.createdAt - b.createdAt
    map.new.sort(sortFn)
    map.cooking.sort(sortFn)
    map.ready.sort(sortFn)
    map.done.sort((a, b) => b.createdAt - a.createdAt)
    return map
  }, [orders])

  const recentDone = byStatus.done.slice(0, 8)

  return (
    <div className="panel kitchen">
      <header className="panel-head kitchen-head">
        <div>
          <h2>キッチン・オーダー画面</h2>
          <p className="panel-lead">カードを左から右へ進め、配膳まで管理するイメージです。</p>
        </div>
        <button type="button" className="btn ghost danger" onClick={() => resetDemo()}>
          デモデータをクリア
        </button>
      </header>

      <div className="kanban">
        {COLUMNS.map((col) => (
          <section key={col.status} className="kanban-col">
            <header>
              <h3>{col.title}</h3>
              <span className="muted small">{col.hint}</span>
              <span className="badge-count">{byStatus[col.status].length}</span>
            </header>
            <div className="kanban-cards">
              {byStatus[col.status].map((o) => (
                <OrderCard key={o.id} order={o} onNext={(s) => advanceStatus(o.id, s)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="done-strip">
        <h3>
          直近の完了 <span className="muted small">（参考表示・最大8件）</span>
        </h3>
        {recentDone.length === 0 ? (
          <p className="muted">完了した注文はまだありません。</p>
        ) : (
          <ul className="done-list">
            {recentDone.map((o) => (
              <li key={o.id}>
                <span className="pill muted-pill">{o.tableLabel}</span>
                <span>{o.items.map((i) => `${i.name}×${i.qty}`).join('、')}</span>
                <time>{formatTime(o.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
