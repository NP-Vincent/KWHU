import { formatUnits } from 'viem'

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatKwhu(value: bigint, maximumFractionDigits = 2) {
  const formatted = Number(formatUnits(value, 18))
  return `${formatted.toLocaleString(undefined, { maximumFractionDigits })} KWHU`
}

export function formatWh(value: bigint) {
  return `${Number(value).toLocaleString()} Wh`
}

export function formatDateTime(value: number | bigint) {
  const timestamp = typeof value === 'bigint' ? Number(value) : value
  if (!timestamp) {
    return 'Not set'
  }

  return new Date(timestamp * 1000).toLocaleString()
}

export function isBytes32Hex(value: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim())
}
