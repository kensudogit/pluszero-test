import { getRuntimeFlags } from '../config/runtimeConfig'

const STORAGE_KEY = 'pz-instore-audit-v1'
const MAX_EVENTS = 200

export type AuditEventType = 'order.created' | 'order.status' | 'orders.cleared'

export type AuditEvent = {
  id: string
  ts: number
  type: AuditEventType
  orderId?: string
  detail: string
}

export function readAuditLog(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as AuditEvent[]
  } catch {
    return []
  }
}

export function appendAuditEvent(entry: Omit<AuditEvent, 'id' | 'ts'>): void {
  if (!getRuntimeFlags().auditEnabled) return
  try {
    const ev: AuditEvent = {
      id: `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      ...entry,
    }
    const next = [ev, ...readAuditLog()].slice(0, MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
}

export function clearAuditLog(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
