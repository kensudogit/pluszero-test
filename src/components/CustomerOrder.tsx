import { useEffect, useMemo, useRef, useState } from 'react'
import { menuByCategory, type MenuItem } from '../data/menu'
import type { OrderLine } from '../types/order'
import { useOrderStore } from '../context/OrderStore'
import { ConfirmDialog } from './ConfirmDialog'
import { formatOrderRef } from '../utils/orderRef'

type CartMap = Record<string, number>

function cartToLines(cart: CartMap, menu: MenuItem[]): OrderLine[] {
  const lines: OrderLine[] = []
  for (const item of menu) {
    const qty = cart[item.id] ?? 0
    if (qty > 0) {
      lines.push({
        menuId: item.id,
        name: item.name,
        unitPrice: item.price,
        qty,
      })
    }
  }
  return lines
}

function cartTotal(lines: OrderLine[]) {
  return lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
}

export function CustomerOrder() {
  const { placeOrder } = useOrderStore()
  const grouped = useMemo(() => menuByCategory(), [])
  const flatMenu = useMemo(() => Object.values(grouped).flat(), [grouped])
  const [table, setTable] = useState('3')
  const [cart, setCart] = useState<CartMap>({})
  const [note, setNote] = useState('')
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [menuQuery, setMenuQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submitLock = useRef(false)

  const filteredGroups = useMemo(() => {
    const q = menuQuery.trim().toLowerCase()
    const out: Record<string, MenuItem[]> = {}
    for (const [category, items] of Object.entries(grouped)) {
      const hit = items.filter(
        (i) =>
          !q ||
          i.name.toLowerCase().includes(q) ||
          category.toLowerCase().includes(q)
      )
      if (hit.length > 0) out[category] = hit
    }
    return out
  }, [grouped, menuQuery])

  const lines = useMemo(() => cartToLines(cart, flatMenu), [cart, flatMenu])
  const total = cartTotal(lines)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!table.trim() || lines.length === 0) return
        e.preventDefault()
        setConfirmOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [table, lines.length])

  function addOne(itemId: string) {
    setCart((c) => ({ ...c, [itemId]: (c[itemId] ?? 0) + 1 }))
  }

  function removeOne(itemId: string) {
    setCart((c) => {
      const next = { ...c }
      const q = (next[itemId] ?? 0) - 1
      if (q <= 0) delete next[itemId]
      else next[itemId] = q
      return next
    })
  }

  function executeSubmit() {
    if (submitLock.current) return
    const label = table.trim()
    if (!label || lines.length === 0) return
    submitLock.current = true
    setSubmitting(true)
    try {
      const o = placeOrder({ tableLabel: label, lines, note })
      setLastOrderId(o.id)
      setCart({})
      setNote('')
      setConfirmOpen(false)
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="panel customer">
      <header className="panel-head">
        <h2>テーブルから注文</h2>
        <p className="panel-lead">
          メニューは検索で絞り込み可能です。送信前に確認ダイアログを挟み、連打による二重送信も抑止します。キッチンは別タブで開いてもストレージ同期します。
        </p>
      </header>

      <div className="menu-search-row">
        <label className="field menu-search-field">
          <span className="field-label">メニュー検索</span>
          <input
            className="input"
            type="search"
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
            placeholder="品名・カテゴリで絞り込み"
            autoComplete="off"
            aria-describedby="menu-search-hint"
          />
          <span id="menu-search-hint" className="field-hint">
            カートに入れた商品は検索して非表示でも数量は維持されます。
          </span>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span className="field-label">卓番・席名</span>
          <input
            className="input"
            id="table-input"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            placeholder="例: 12 または A-2"
            autoComplete="off"
            aria-describedby="table-hint"
          />
          <span id="table-hint" className="field-hint">
            ホール案内と同一の卓番・席名を入力してください（本デモでは形式チェックのみ省略）。
          </span>
        </label>
      </div>

      <div className="menu-grid">
        {Object.keys(filteredGroups).length === 0 ? (
          <p className="muted menu-empty" role="status">
            検索に一致するメニューがありません。条件を変えてください。
          </p>
        ) : null}
        {Object.entries(filteredGroups).map(([category, items]) => (
          <section key={category} className="menu-category" aria-label={`カテゴリ ${category}`}>
            <h3>{category}</h3>
            <ul className="menu-list">
              {items.map((item) => {
                const qty = cart[item.id] ?? 0
                return (
                  <li key={item.id} className="menu-item">
                    <div className="menu-item-text">
                      <span className="menu-name">{item.name}</span>
                      <span className="menu-price">¥{item.price.toLocaleString('ja-JP')}</span>
                    </div>
                    <div className="qty">
                      <button
                        type="button"
                        className="btn ghost"
                        aria-label={`${item.name}の数量を1つ減らす`}
                        onClick={() => removeOne(item.id)}
                      >
                        −
                      </button>
                      <span className="qty-val" aria-live="polite" aria-atomic="true">
                        {qty}
                      </span>
                      <button
                        type="button"
                        className="btn primary"
                        aria-label={`${item.name}の数量を1つ増やす`}
                        onClick={() => addOne(item.id)}
                      >
                        ＋
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <aside className="cart" aria-label="注文カート">
        <div className="cart-head">
          <h3>
            カート <span className="cart-count">({lines.length}種)</span>
          </h3>
          <span className="cart-total">計 ¥{total.toLocaleString('ja-JP')}</span>
        </div>
        {lines.length === 0 ? (
          <p className="muted">商品を選ぶとここに内訳が表示されます。</p>
        ) : (
          <ul className="cart-lines">
            {lines.map((l) => (
              <li key={l.menuId}>
                <span>
                  {l.name} ×{l.qty}
                </span>
                <span>¥{(l.unitPrice * l.qty).toLocaleString('ja-JP')}</span>
              </li>
            ))}
          </ul>
        )}
        <label className="field">
          <span className="field-label">伝票メモ（アレルギー等）</span>
          <textarea
            className="input textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="例: 唐揚げは少なめで"
            aria-describedby="note-hint"
          />
          <span id="note-hint" className="field-hint">
            キッチン画面にも同じ内容が表示されます。
          </span>
        </label>
        <button
          type="button"
          className="btn accent wide"
          disabled={!table.trim() || lines.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          送信内容の確認へ
        </button>
        <p className="shortcut-hint" aria-hidden="true">
          ショートカット: Ctrl+Enter でも確認ダイアログを開けます
        </p>
        {lastOrderId ? (
          <p className="toast" role="status" aria-live="polite">
            注文を受け付けました（参照{' '}
            <strong>{formatOrderRef(lastOrderId)}</strong> · ID <code>{lastOrderId}</code>
            ）。別タブのキッチン画面／再読込で表示を確認できます。
          </p>
        ) : null}
      </aside>

      <ConfirmDialog
        open={confirmOpen}
        title="キッチンへ送信しますか？"
        description="送信後、このブラウザのキッチン画面・別タブへストレージ経由で反映されます。"
        confirmLabel="送信する"
        cancelLabel="戻る"
        busy={submitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={executeSubmit}
      >
        <dl className="confirm-summary">
          <div className="confirm-row">
            <dt>卓</dt>
            <dd>{table.trim()}</dd>
          </div>
          <div className="confirm-row confirm-row--block">
            <dt>内訳</dt>
            <dd>
              <ul>
                {lines.map((l) => (
                  <li key={l.menuId}>
                    {l.name} ×{l.qty} … ¥{(l.unitPrice * l.qty).toLocaleString('ja-JP')}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          {note.trim() ? (
            <div className="confirm-row">
              <dt>メモ</dt>
              <dd>{note.trim()}</dd>
            </div>
          ) : null}
          <div className="confirm-row confirm-total">
            <dt>合計（税込想定）</dt>
            <dd>¥{total.toLocaleString('ja-JP')}</dd>
          </div>
        </dl>
      </ConfirmDialog>
    </div>
  )
}
