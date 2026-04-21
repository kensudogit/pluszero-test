import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { appendAuditEvent } from '../audit/auditLog'
import type { KitchenOrder, OrderLine, OrderStatus } from '../types/order'

const STORAGE_KEY = 'pluszero-test-restaurant-orders'

const PERSIST_FAIL_MSG =
  'ブラウザの保存領域に書き込めませんでした（容量不足やプライベートモード等）。画面はこのタブのみ更新されています。内容を控えてからタブを閉じないでください。'

function loadOrders(): KitchenOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as KitchenOrder[]
  } catch {
    return []
  }
}

function tryWriteStorage(next: KitchenOrder[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return true
  } catch {
    return false
  }
}

function newId() {
  return `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

type CartLineInput = OrderLine

type OrderStoreValue = {
  orders: KitchenOrder[]
  persistError: string | null
  clearPersistError: () => void
  reloadFromStorage: () => void
  placeOrder: (input: {
    tableLabel: string
    lines: CartLineInput[]
    note: string
  }) => KitchenOrder
  advanceStatus: (orderId: string, status: OrderStatus) => void
  resetDemo: () => void
}

const OrderStoreContext = createContext<OrderStoreValue | null>(null)

export function OrderStoreProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<KitchenOrder[]>(() => loadOrders())
  const [persistError, setPersistError] = useState<string | null>(null)

  const reloadFromStorage = useCallback(() => {
    setPersistError(null)
    setOrders(loadOrders())
  }, [])

  const clearPersistError = useCallback(() => setPersistError(null), [])

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.storageArea !== localStorage || e.key !== STORAGE_KEY) return
      if (e.newValue === null) {
        setOrders([])
        return
      }
      try {
        const parsed = JSON.parse(e.newValue) as unknown
        if (Array.isArray(parsed)) setOrders(parsed as KitchenOrder[])
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== 'visible') return
      setOrders(loadOrders())
      setPersistError(null)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const placeOrder = useCallback((input: { tableLabel: string; lines: CartLineInput[]; note: string }) => {
    const order: KitchenOrder = {
      id: newId(),
      tableLabel: input.tableLabel.trim(),
      createdAt: Date.now(),
      items: input.lines.filter((l) => l.qty > 0),
      note: input.note.trim(),
      status: 'new',
    }
    setOrders((prev) => {
      const next = [order, ...prev]
      const ok = tryWriteStorage(next)
      queueMicrotask(() => {
        setPersistError(ok ? null : PERSIST_FAIL_MSG)
        appendAuditEvent({
          type: 'order.created',
          orderId: order.id,
          detail: `卓 ${order.tableLabel} / 明細 ${order.items.length} 行`,
        })
      })
      return next
    })
    return order
  }, [])

  const advanceStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((prev) => {
      const before = prev.find((o) => o.id === orderId)
      const next = prev.map((o) => {
        if (o.id !== orderId) return o
        const patch: Partial<KitchenOrder> = { status }
        if (status === 'done') patch.completedAt = Date.now()
        return { ...o, ...patch }
      })
      const ok = tryWriteStorage(next)
      queueMicrotask(() => {
        setPersistError(ok ? null : PERSIST_FAIL_MSG)
        appendAuditEvent({
          type: 'order.status',
          orderId,
          detail: `${before?.status ?? '?'} → ${status}`,
        })
      })
      return next
    })
  }, [])

  const resetDemo = useCallback(() => {
    setOrders(() => {
      const next: KitchenOrder[] = []
      const ok = tryWriteStorage(next)
      queueMicrotask(() => {
        setPersistError(ok ? null : PERSIST_FAIL_MSG)
        appendAuditEvent({ type: 'orders.cleared', detail: 'デモデータ全削除' })
      })
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      orders,
      persistError,
      clearPersistError,
      reloadFromStorage,
      placeOrder,
      advanceStatus,
      resetDemo,
    }),
    [
      orders,
      persistError,
      clearPersistError,
      reloadFromStorage,
      placeOrder,
      advanceStatus,
      resetDemo,
    ]
  )

  return (
    <OrderStoreContext.Provider value={value}>{children}</OrderStoreContext.Provider>
  )
}

// Context とフックを同ファイルにまとめる一般的なパターン
// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with provider
export function useOrderStore() {
  const ctx = useContext(OrderStoreContext)
  if (!ctx) throw new Error('useOrderStore must be used within OrderStoreProvider')
  return ctx
}
