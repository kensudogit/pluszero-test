import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { KitchenOrder, OrderLine, OrderStatus } from '../types/order'

const STORAGE_KEY = 'pluszero-test-restaurant-orders'

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

function persist(orders: KitchenOrder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
}

function newId() {
  return `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

type CartLineInput = OrderLine

type OrderStoreValue = {
  orders: KitchenOrder[]
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

  const placeOrder = useCallback(
    (input: { tableLabel: string; lines: CartLineInput[]; note: string }) => {
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
        persist(next)
        return next
      })
      return order
    },
    []
  )

  const advanceStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      persist(next)
      return next
    })
  }, [])

  const resetDemo = useCallback(() => {
    setOrders([])
    persist([])
  }, [])

  const value = useMemo(
    () => ({ orders, placeOrder, advanceStatus, resetDemo }),
    [orders, placeOrder, advanceStatus, resetDemo]
  )

  return (
    <OrderStoreContext.Provider value={value}>{children}</OrderStoreContext.Provider>
  )
}

export function useOrderStore() {
  const ctx = useContext(OrderStoreContext)
  if (!ctx) throw new Error('useOrderStore must be used within OrderStoreProvider')
  return ctx
}
