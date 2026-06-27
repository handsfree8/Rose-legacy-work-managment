export function surcharge(total: number): { gross: number; fee: number } {
  const t = Number(total) || 0
  if (t <= 0) return { gross: 0, fee: 0 }
  const gross = Math.round(((t + 0.3) / (1 - 0.029)) * 100) / 100
  const fee = Math.round((gross - t) * 100) / 100
  return { gross, fee }
}
