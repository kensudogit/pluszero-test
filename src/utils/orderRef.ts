/** 店内連絡用の短い参照番号（フル ID の末尾を可読化） */
export function formatOrderRef(orderId: string): string {
  const raw = orderId.replace(/^o-/, '')
  const tail = raw.slice(-8).toUpperCase()
  return `#${tail}`
}
