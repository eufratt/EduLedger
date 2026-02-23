export function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatCompactIDR(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `Rp ${Math.round(n / 1_000_000_000)} M`
  if (abs >= 1_000_000) return `Rp ${Math.round(n / 1_000_000)} Jt`
  if (abs >= 1_000) return `Rp ${Math.round(n / 1_000)} Rb`
  return `Rp ${Math.round(n)}`
}