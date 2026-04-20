export type OrderStatus = 'new' | 'cooking' | 'ready' | 'done'

export type OrderLine = {
  menuId: string
  name: string
  unitPrice: number
  qty: number
}

export type KitchenOrder = {
  id: string
  tableLabel: string
  createdAt: number
  /** 配膳完了に遷移した時刻（KPI・プレゼン用）。既存データには無い場合あり */
  completedAt?: number
  items: OrderLine[]
  note: string
  status: OrderStatus
}
