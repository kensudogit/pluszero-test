import type { KitchenOrder } from '../types/order'
import { MENU_ITEMS } from '../data/menu'

const menuCategoryById = Object.fromEntries(MENU_ITEMS.map((m) => [m.id, m.category]))

export type Scope = 'all' | 'completed'

export type SummaryStats = {
  orderCount: number
  lineCount: number
  revenue: number
  avgTicket: number
  avgLeadMs: number | null
  completedOrders: number
}

export type ItemAgg = {
  menuId: string
  name: string
  category: string
  qty: number
  revenue: number
}

export type HourAgg = {
  hour: number
  count: number
}

export type DayAgg = {
  dateKey: string
  label: string
  orders: number
  revenue: number
}

/** 日別に加え、その日のユニーク卓数（集客の目安） */
export type DayAggWithTables = DayAgg & { uniqueTables: number }

export type StatusAgg = Record<string, number>

export type LeadBucket = { label: string; minMs: number; maxMs: number | null; count: number }

export type TableAgg = { label: string; orders: number; revenue: number }

function orderMatchesScope(o: KitchenOrder, scope: Scope): boolean {
  if (scope === 'completed') return o.status === 'done'
  return true
}

/** 一覧サマリー */
export function computeSummary(orders: KitchenOrder[], scope: Scope): SummaryStats {
  const filtered = orders.filter((o) => orderMatchesScope(o, scope))
  let revenue = 0
  let lineCount = 0

  for (const o of filtered) {
    for (const line of o.items) {
      lineCount += line.qty
      revenue += line.unitPrice * line.qty
    }
  }

  let leadSumMs = 0
  let leadN = 0
  for (const o of filtered) {
    if (o.status === 'done' && o.completedAt != null) {
      leadSumMs += o.completedAt - o.createdAt
      leadN += 1
    }
  }

  const completedOrders = orders.filter((o) => o.status === 'done').length
  const avgTicket = filtered.length === 0 ? 0 : revenue / filtered.length
  const avgLeadMs = leadN === 0 ? null : leadSumMs / leadN

  return {
    orderCount: filtered.length,
    lineCount,
    revenue,
    avgTicket,
    avgLeadMs,
    completedOrders,
  }
}

/** メニュー別売上・数量（上位での表示用にソート済み） */
export function aggregateItems(orders: KitchenOrder[], scope: Scope): ItemAgg[] {
  const map = new Map<string, ItemAgg>()
  const filtered = orders.filter((o) => orderMatchesScope(o, scope))

  for (const o of filtered) {
    for (const line of o.items) {
      const prev =
        map.get(line.menuId) ??
        ({
          menuId: line.menuId,
          name: line.name,
          category: menuCategoryById[line.menuId] ?? 'その他',
          qty: 0,
          revenue: 0,
        } as ItemAgg)
      prev.qty += line.qty
      prev.revenue += line.unitPrice * line.qty
      map.set(line.menuId, prev)
    }
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}

/** カテゴリ別売上 */
export function aggregateCategoryRevenue(orders: KitchenOrder[], scope: Scope): { category: string; revenue: number }[] {
  const items = aggregateItems(orders, scope)
  const catMap = new Map<string, number>()
  for (const row of items) {
    catMap.set(row.category, (catMap.get(row.category) ?? 0) + row.revenue)
  }
  return [...catMap.entries()]
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
}

/** 受付時刻の時間帯別（0–23）注文件数 */
export function aggregateHourly(orders: KitchenOrder[], scope: Scope): HourAgg[] {
  const filtered = orders.filter((o) => orderMatchesScope(o, scope))
  const counts = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
  for (const o of filtered) {
    const h = new Date(o.createdAt).getHours()
    counts[h].count += 1
  }
  return counts
}

/** 直近7日間（データがある範囲で日別） */
export function aggregateDaily(orders: KitchenOrder[], scope: Scope, days = 7): DayAgg[] {
  const filtered = orders.filter((o) => orderMatchesScope(o, scope))
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const keys: { dateKey: string; label: string; start: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * dayMs)
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    keys.push({ dateKey, label, start })
  }

  const bucket = new Map<string, { orders: number; revenue: number }>()
  for (const k of keys) {
    bucket.set(k.dateKey, { orders: 0, revenue: 0 })
  }

  for (const o of filtered) {
    const d = new Date(o.createdAt)
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!bucket.has(dateKey)) continue
    const b = bucket.get(dateKey)!
    b.orders += 1
    for (const line of o.items) {
      b.revenue += line.unitPrice * line.qty
    }
  }

  return keys.map(({ dateKey, label }) => ({
    dateKey,
    label,
    orders: bucket.get(dateKey)!.orders,
    revenue: bucket.get(dateKey)!.revenue,
  }))
}

/** 直近 N 日の日別売上・注文数・ユニーク卓数（予想モデル用） */
export function aggregateDailyWithTables(
  orders: KitchenOrder[],
  scope: Scope,
  days = 14
): DayAggWithTables[] {
  const filtered = orders.filter((o) => orderMatchesScope(o, scope))
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const keys: { dateKey: string; label: string }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * dayMs)
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    keys.push({ dateKey, label })
  }

  const bucket = new Map<string, { orders: number; revenue: number; tables: Set<string> }>()
  for (const k of keys) {
    bucket.set(k.dateKey, { orders: 0, revenue: 0, tables: new Set() })
  }

  for (const o of filtered) {
    const d = new Date(o.createdAt)
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!bucket.has(dateKey)) continue
    const b = bucket.get(dateKey)!
    b.orders += 1
    b.tables.add(o.tableLabel.trim() || '—')
    for (const line of o.items) {
      b.revenue += line.unitPrice * line.qty
    }
  }

  return keys.map(({ dateKey, label }) => {
    const b = bucket.get(dateKey)!
    return {
      dateKey,
      label,
      orders: b.orders,
      revenue: b.revenue,
      uniqueTables: b.tables.size,
    }
  })
}

/** 現在のステータス内訳（スナップショット） */
export function aggregateStatusSnapshot(orders: KitchenOrder[]): StatusAgg {
  const agg: StatusAgg = { new: 0, cooking: 0, ready: 0, done: 0 }
  for (const o of orders) {
    agg[o.status] = (agg[o.status] ?? 0) + 1
  }
  return agg
}

/** 完了注文のリードタイム分布（完了済みのみ） */
export function aggregateLeadBuckets(orders: KitchenOrder[]): LeadBucket[] {
  const defs: LeadBucket[] = [
    { label: '〜2分', minMs: 0, maxMs: 2 * 60 * 1000, count: 0 },
    { label: '2〜5分', minMs: 2 * 60 * 1000, maxMs: 5 * 60 * 1000, count: 0 },
    { label: '5〜10分', minMs: 5 * 60 * 1000, maxMs: 10 * 60 * 1000, count: 0 },
    { label: '10分以上', minMs: 10 * 60 * 1000, maxMs: null, count: 0 },
  ]

  for (const o of orders) {
    if (o.status !== 'done' || o.completedAt == null) continue
    const ms = o.completedAt - o.createdAt
    if (ms < 2 * 60 * 1000) defs[0].count += 1
    else if (ms < 5 * 60 * 1000) defs[1].count += 1
    else if (ms < 10 * 60 * 1000) defs[2].count += 1
    else defs[3].count += 1
  }

  return defs
}

/** 卓別売上・件数（上位表示用） */
export function aggregateByTable(orders: KitchenOrder[], scope: Scope): TableAgg[] {
  const filtered = orders.filter((o) => orderMatchesScope(o, scope))
  const map = new Map<string, TableAgg>()
  for (const o of filtered) {
    const label = o.tableLabel.trim() || '—'
    const prev = map.get(label) ?? { label, orders: 0, revenue: 0 }
    prev.orders += 1
    for (const line of o.items) {
      prev.revenue += line.unitPrice * line.qty
    }
    map.set(label, prev)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}
