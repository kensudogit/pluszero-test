import type { Scope } from './orderAnalytics'
import type { KitchenOrder } from '../types/order'
import { aggregateDailyWithTables } from './orderAnalytics'

export type ForecastPoint = {
  label: string
  dateKey: string
  revenue: number
  orders: number
  uniqueTables: number
}

export type ForecastBundle = {
  horizon: number
  lookbackDays: number
  confidence: 'high' | 'medium' | 'low'
  summary: {
    revenue7d: number
    orders7d: number
    avgDailyRevenueForecast: number
    avgDailyOrdersForecast: number
    avgDailyUniqueTablesForecast: number
  }
  points: ForecastPoint[]
  notes: string[]
}

function linReg(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length
  if (n === 0) return { slope: 0, intercept: 0 }
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  const intercept = my - slope * mx
  return { slope, intercept }
}

function blend(reg: number, mean: number, weightReg: number): number {
  return reg * weightReg + mean * (1 - weightReg)
}

/** 単純線形トレンド＋平均のブレンドで、売上・注文件数・ユニーク卓数を数日先まで推定します。 */
export function computeForecast(
  orders: KitchenOrder[],
  scope: Scope,
  options?: { lookbackDays?: number; horizon?: number }
): ForecastBundle {
  const lookbackDays = options?.lookbackDays ?? 14
  const horizon = options?.horizon ?? 7

  const daily = aggregateDailyWithTables(orders, scope, lookbackDays)
  const n = daily.length
  const xs = daily.map((_, i) => i)

  const revenues = daily.map((d) => d.revenue)
  const orderNs = daily.map((d) => d.orders)
  const tableNs = daily.map((d) => d.uniqueTables)

  const sumRev = revenues.reduce((a, b) => a + b, 0)
  const sumOrd = orderNs.reduce((a, b) => a + b, 0)
  const sumTbl = tableNs.reduce((a, b) => a + b, 0)

  const daysWithOrders = revenues.filter((r) => r > 0).length
  const totalOrdersInWindow = orderNs.reduce((a, b) => a + b, 0)

  const meanRev = n > 0 ? sumRev / n : 0
  const meanOrd = n > 0 ? sumOrd / n : 0
  const meanTbl = n > 0 ? sumTbl / n : 0

  const rr = linReg(xs, revenues)
  const ro = linReg(xs, orderNs)
  const rt = linReg(xs, tableNs)

  const notes: string[] = []
  let confidence: ForecastBundle['confidence'] = 'medium'

  if (totalOrdersInWindow === 0) {
    confidence = 'low'
    notes.push('予想に使える実績がありません。注文データが溜まると精度が上がります。')
  } else if (daysWithOrders < 3 || totalOrdersInWindow < 8) {
    confidence = 'low'
    notes.push('実績日・件数が少ないため、直近平均を強めに効かせた保守的な予想です。')
  } else if (daysWithOrders >= 7 && totalOrdersInWindow >= 20) {
    confidence = 'high'
    notes.push('ある程度の日次実績があるため、トレンドを反映した予想です（季節・イベントは未考慮）。')
  } else {
    notes.push('トレンドと平均のバランス推定です。キャンペーンや定休日は反映されません。')
  }

  const weightReg = confidence === 'high' ? 0.72 : confidence === 'medium' ? 0.55 : 0.35

  const points: ForecastPoint[] = []
  let revSum = 0
  let ordSum = 0
  const dayMs = 24 * 60 * 60 * 1000

  for (let j = 0; j < horizon; j++) {
    const future = new Date(Date.now() + (j + 1) * dayMs)
    const dateKey = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`
    const label = `${future.getMonth() + 1}/${future.getDate()}`

    const x = n + j
    let pr = rr.intercept + rr.slope * x
    let po = ro.intercept + ro.slope * x
    let pt = rt.intercept + rt.slope * x

    if (totalOrdersInWindow === 0) {
      pr = 0
      po = 0
      pt = 0
    } else {
      pr = blend(pr, meanRev, weightReg)
      po = blend(po, meanOrd, weightReg)
      pt = blend(pt, meanTbl, weightReg)
      pr = Math.max(0, pr)
      po = Math.max(0, Math.round(po))
      pt = Math.max(0, Math.round(pt))
    }

    revSum += pr
    ordSum += po

    points.push({
      label,
      dateKey,
      revenue: pr,
      orders: po,
      uniqueTables: pt,
    })
  }

  return {
    horizon,
    lookbackDays,
    confidence,
    summary: {
      revenue7d: revSum,
      orders7d: ordSum,
      avgDailyRevenueForecast: horizon > 0 ? revSum / horizon : 0,
      avgDailyOrdersForecast: horizon > 0 ? ordSum / horizon : 0,
      avgDailyUniqueTablesForecast: horizon > 0
        ? points.reduce((s, p) => s + p.uniqueTables, 0) / horizon
        : 0,
    },
    points,
    notes,
  }
}
