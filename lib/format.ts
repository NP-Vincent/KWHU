import { formatUnits } from 'viem'

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatKwhu(value: bigint, maximumFractionDigits = 2) {
  const formatted = Number(formatUnits(value, 18))
  return `${formatted.toLocaleString(undefined, { maximumFractionDigits })} KWHU`
}
