import { useMemo, useState } from 'react'
import { menuByCategory, type MenuItem } from '../data/menu'
import type { OrderLine } from '../types/order'
import { useOrderStore } from '../context/OrderStore'

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
  const [table, setTable] = useState('3')
  const [cart, setCart] = useState<CartMap>({})
  const [note, setNote] = useState('')
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)

  const lines = useMemo(() => cartToLines(cart, Object.values(grouped).flat()), [cart, grouped])
  const total = cartTotal(lines)

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

  function handleSubmit() {
    const label = table.trim()
    if (!label) return
    if (lines.length === 0) return
    const o = placeOrder({ tableLabel: label, lines, note })
    setLastOrderId(o.id)
    setCart({})
    setNote('')
  }

  return (
    <div className="panel customer">
      <header className="panel-head">
        <h2>テーブルから注文</h2>
        <p className="panel-lead">
          卓番を入れてメニューを選び、キッチンに注文を送ります（同一PCのデモ用）。
        </p>
      </header>

      <div className="field-row">
        <label className="field">
          <span className="field-label">卓番・席名</span>
          <input
            className="input"
            inputMode="numeric"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            placeholder="例: 12 または A-2"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="menu-grid">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="menu-category">
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
                      <button type="button" className="btn ghost" onClick={() => removeOne(item.id)}>
                        −
                      </button>
                      <span className="qty-val" aria-live="polite">
                        {qty}
                      </span>
                      <button type="button" className="btn primary" onClick={() => addOne(item.id)}>
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

      <aside className="cart">
        <div className="cart-head">
          <h3>カート</h3>
          <span className="cart-total">計 ¥{total.toLocaleString('ja-JP')}</span>
        </div>
        {lines.length === 0 ? (
          <p className="muted">商品を選ぶとここに表示されます。</p>
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
          />
        </label>
        <button
          type="button"
          className="btn accent wide"
          disabled={!table.trim() || lines.length === 0}
          onClick={handleSubmit}
        >
          キッチンに送信
        </button>
        {lastOrderId ? (
          <p className="toast" role="status">
            注文を受け付けました（注文ID: <code>{lastOrderId}</code>）
          </p>
        ) : null}
      </aside>
    </div>
  )
}
