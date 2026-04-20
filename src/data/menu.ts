export type MenuItem = {
  id: string
  name: string
  price: number
  category: string
}

/** 画面イメージ用のダミーメニュー（金額は税込想定のイメージ） */
export const MENU_ITEMS: MenuItem[] = [
  { id: 'drink-beer', name: '生ビール（中）', price: 580, category: 'ドリンク' },
  { id: 'drink-tea', name: 'ウーロン茶', price: 380, category: 'ドリンク' },
  { id: 'food-edamame', name: '枝豆', price: 420, category: '一品' },
  { id: 'food-salad', name: 'シーザーサラダ', price: 680, category: '一品' },
  { id: 'food-karaage', name: '鶏の唐揚げ', price: 780, category: '一品' },
  { id: 'main-pasta', name: 'トマトクリームパスタ', price: 1180, category: 'メイン' },
  { id: 'main-curry', name: 'バターチキンカレー', price: 1080, category: 'メイン' },
  { id: 'main-steak', name: 'ハンバーグステーキ', price: 1380, category: 'メイン' },
]

export function menuByCategory(): Record<string, MenuItem[]> {
  const map: Record<string, MenuItem[]> = {}
  for (const item of MENU_ITEMS) {
    if (!map[item.category]) map[item.category] = []
    map[item.category].push(item)
  }
  return map
}
