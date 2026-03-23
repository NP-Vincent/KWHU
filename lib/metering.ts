import { keccak256, stringToHex } from 'viem'

const meteringServiceUrl =
  process.env.NEXT_PUBLIC_METERING_SERVICE_URL || 'http://localhost:4100'

export type WalletActivityResponse = {
  meters: Array<Record<string, unknown>>
  agreements: Array<Record<string, unknown>>
  readings: Array<Record<string, unknown>>
  settlements: Array<Record<string, unknown>>
}

export function createMeteringActionMessage(
  action: string,
  walletAddress: string,
  issuedAt: string,
) {
  return `KWHU ${action}\nWallet: ${walletAddress.toLowerCase()}\nIssued At: ${issuedAt}`
}

export function deriveMeterId(label: string) {
  const normalized = label.trim()
  if (!normalized) {
    return ''
  }

  return keccak256(stringToHex(normalized))
}

export async function signedMeteringRequest<TResponse>(
  endpoint: string,
  action: string,
  walletAddress: string,
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>,
  body: Record<string, unknown> = {},
) {
  const issuedAt = new Date().toISOString()
  const signature = await signMessageAsync({
    message: createMeteringActionMessage(action, walletAddress, issuedAt),
  })

  const response = await fetch(`${meteringServiceUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      walletAddress,
      issuedAt,
      signature,
    }),
  })

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null
    throw new Error(errorPayload?.error || 'Metering service request failed')
  }

  return (await response.json()) as TResponse
}

export async function fetchWalletActivity(walletAddress: string) {
  const response = await fetch(
    `${meteringServiceUrl}/api/readings?walletAddress=${walletAddress}`,
  )

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null
    throw new Error(errorPayload?.error || 'Failed to fetch wallet activity')
  }

  return (await response.json()) as WalletActivityResponse
}
