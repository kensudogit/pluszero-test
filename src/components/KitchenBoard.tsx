import { useMemo, useRef, useState } from 'react'
import type { KitchenOrder, OrderStatus } from '../types/order'
import { useOrderStore } from '../context/OrderStore'
import { formatElapsed, formatElapsedShort } from '../utils/formatElapsed'
import { useNow } from '../hooks/useNow'
import { ConfirmDialog } from './ConfirmDialog'
import { formatOrderRef } from '../utils/orderRef'
import { printKitchenTicket } from '../utils/printOrderTicket'

const COLUMNS: { status: OrderStatus; title: string; hint: string }[] = [
  { status: 'new', title: '新規', hint: '調理待ちキュー（経過長は強調）' },
  { status: 'cooking', title: '調理中', hint: 'ステーションで作業中' },
  { status: 'ready', title: '提供待ち', hint: 'ホールへ引き渡し可能' },
]

const MS_WARN = 3 * 60 * 1000
const MS_CRIT = 8 * 60 * 1000
const ADVANCE_COOLDOWN_MS = 420

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function OrderCard({
  order,
  now,
  onAdvance,
}: {
  order: KitchenOrder
  now: number
  onAdvance: (next: OrderStatus) => void
}) {
  const lockRef = useRef(false)
  const total = order.items.reduce((s, l) => s + l.unitPrice * l.qty, 0)
  const elapsed = now - order.createdAt
  let urgency = ''
  if (order.status === 'new') {
    if (elapsed >= MS_CRIT) urgency = 'crit'
    else if (elapsed >= MS_WARN) urgency = 'warn'
  }

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

  function handleAdvance() {
    if (!nextStatus || lockRef.current) return
    lockRef.current = true
    onAdvance(nextStatus)
    window.setTimeout(() => {
      lockRef.current = false
    }, ADVANCE_COOLDOWN_MS)
  }

  const refLabel = formatOrderRef(order.id)

  return (
    <article
      className={`order-card${urgency ? ` order-card--${urgency}` : ''}`}
      aria-label={`${refLabel} 卓${order.tableLabel}の注文`}
    >
      <div className="order-card-ref-row">
        <span className="order-ref-code" title="店内連絡・伝票用の短縮番号">
          {refLabel}
        </span>
        <button
          type="button"
          className="btn ghost btn-compact"
          onClick={() => printKitchenTicket(order)}
        >
          伝票印刷
        </button>
      </div>
      <div className="order-card-top">
        <span className="pill table-pill">卓 {order.tableLabel}</span>
        <div className="order-times">
          <time className="time" dateTime={new Date(order.createdAt).toISOString()} title="受付時刻">
            {formatClock(order.createdAt)}
          </time>
          <span className="elapsed-chip" title="受付からの経過時間">
            {formatElapsed(elapsed)}
          </span>
        </div>
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
          <button type="button" className="btn primary" onClick={handleAdvance}>
            {primary}
          </button>
        ) : null}
      </div>
    </article>
  )
}

export function KitchenBoard() {
  const { orders, advanceStatus, clearAllOrders, reloadFromStorage } = useOrderStore()
  const now = useNow()
  const [resetOpen, setResetOpen] = useState(false)

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

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'done')
    const backlog = orders.filter((o) => o.status === 'new').length
    const inflight = orders.filter((o) => o.status === 'cooking' || o.status === 'ready').length
    const doneAll = orders.filter((o) => o.status === 'done')
    const timed = doneAll.filter((o) => o.completedAt != null)
    const avgLeadMs =
      timed.length === 0
        ? null
        : timed.reduce((s, o) => s + (o.completedAt! - o.createdAt), 0) / timed.length
    return {
      active: active.length,
      backlog,
      inflight,
      served: doneAll.length,
      avgLeadMs,
    }
  }, [orders])

  return (
    <div className="panel kitchen">
      <header className="panel-head kitchen-head">
        <div>
          <h2>キッチン・オーダーディスプレイ</h2>
          <p className="panel-lead">
            別タブの卓画面と保存領域を共有します。更新されない場合は「再読込」を試してください。ステータス連打はクールダウンで誤操作を抑制します。
          </p>
        </div>
        <div className="kitchen-head-actions">
          <button type="button" className="btn ghost btn-compact" onClick={() => reloadFromStorage()}>
            再読込
          </button>
          <button type="button" className="btn ghost danger" onClick={() => setResetOpen(true)}>
            全オーダーをクリア…
          </button>
        </div>
      </header>

      <section className="stats-strip" aria-label="オペレーション指標（この端末）">
        <div className="stat-chip">
          <span className="stat-label">アクティブ件数</span>
          <span className="stat-value">{stats.active}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">調理待ち（新規）</span>
          <span className="stat-value">{stats.backlog}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">調理〜提供待ち</span>
          <span className="stat-value">{stats.inflight}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-label">完了（累計）</span>
          <span className="stat-value">{stats.served}</span>
        </div>
        <div className="stat-chip stat-chip--wide">
          <span className="stat-label">完了まで平均リードタイム</span>
          <span className="stat-value stat-value--muted" title="完了時刻が記録された注文のみ集計">
            {stats.avgLeadMs != null ? formatElapsedShort(stats.avgLeadMs) : '—'}
          </span>
        </div>
      </section>

      <div className="kanban">
        {COLUMNS.map((col) => (
          <section key={col.status} className="kanban-col" aria-label={`${col.title}列`}>
            <header>
              <h3>{col.title}</h3>
              <span className="muted small">{col.hint}</span>
              <span className="badge-count">{byStatus[col.status].length}</span>
            </header>
            <div className="kanban-cards">
              {byStatus[col.status].length === 0 ? (
                <div className="kanban-empty">
                  <span className="kanban-empty-title">該当なし</span>
                  <span className="kanban-empty-hint">注文が入るとカードが並びます</span>
                </div>
              ) : (
                byStatus[col.status].map((o) => (
                  <OrderCard key={o.id} order={o} now={now} onAdvance={(s) => advanceStatus(o.id, s)} />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="done-strip" aria-label="直近の完了注文">
        <h3>
          直近の完了 <span className="muted small">（最大8件・この端末の保存データ）</span>
        </h3>
        {recentDone.length === 0 ? (
          <p className="muted">完了した注文はまだありません。</p>
        ) : (
          <ul className="done-list">
            {recentDone.map((o) => {
              const lead =
                o.completedAt != null ? formatElapsedShort(o.completedAt - o.createdAt) : '—'
              return (
                <li key={o.id}>
                  <span className="pill muted-pill" title={o.id}>
                    {formatOrderRef(o.id)} · {o.tableLabel}
                  </span>
                  <span>{o.items.map((i) => `${i.name}×${i.qty}`).join('、')}</span>
                  <span className="done-lead" title="受付〜配膳完了まで">
                    {lead}
                  </span>
                  <time>{formatClock(o.createdAt)}</time>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={resetOpen}
        title="保存されている全注文を削除しますか？"
        description="この端末のブラウザに保存されている注文履歴が消えます。この操作は取り消せません。"
        confirmLabel="削除する"
        cancelLabel="やめる"
        danger
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          clearAllOrders()
          setResetOpen(false)
        }}
      />
    </div>
  )
}
