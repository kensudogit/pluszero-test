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
  items: OrderLine[]
  note: string
  status: OrderStatus
}
