import { createHash, randomBytes } from 'node:crypto'

import { keccak256, stringToHex } from 'viem'

import type { MeterPayload } from './types.js'

const walletTopicPattern = /^kwhu\/meters\/(0x[a-fA-F0-9]{40})\/(0x[a-fA-F0-9]{64})\/renewable$/

export function createWalletActionMessage(action: string, walletAddress: string, issuedAt: string) {
  return `KWHU ${action}\nWallet: ${walletAddress.toLowerCase()}\nIssued At: ${issuedAt}`
}

export function createPublisherTopicPattern(walletAddress: string) {
  return `kwhu/meters/${walletAddress.toLowerCase()}/+/renewable`
}

export function parseMeterTopic(topic: string) {
  const match = walletTopicPattern.exec(topic)
  if (!match) {
    throw new Error('Invalid topic')
  }

  return {
    sellerWallet: match[1].toLowerCase(),
    meterId: match[2].toLowerCase(),
  }
}

export function normalizeMeterPayload(payload: unknown): MeterPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload body')
  }

  const candidate = payload as Record<string, unknown>
  const readingId = String(candidate.readingId || '').trim()
  const meterId = String(candidate.meterId || '').trim().toLowerCase()
  const sellerWallet = String(candidate.sellerWallet || '').trim().toLowerCase()
  const timestamp = String(candidate.timestamp || '').trim()
  const sourceType = String(candidate.sourceType || '').trim().toLowerCase()
  const cumulativeWhValue = candidate.cumulativeWh

  if (!readingId || !meterId || !sellerWallet || !timestamp || !sourceType) {
    throw new Error('Missing required meter payload fields')
  }

  if (
    !(
      typeof cumulativeWhValue === 'number' ||
      typeof cumulativeWhValue === 'string'
    )
  ) {
    throw new Error('Invalid cumulativeWh')
  }

  return {
    readingId,
    meterId,
    sellerWallet,
    timestamp,
    cumulativeWh: cumulativeWhValue,
    sourceType,
  }
}

export function normalizeCumulativeWh(value: string | number) {
  const normalized = BigInt(value)
  if (normalized < 0n) {
    throw new Error('cumulativeWh must be positive')
  }
  return normalized
}

export function computeEnergyDelta(previousCumulativeWh: bigint | null, currentCumulativeWh: bigint) {
  if (previousCumulativeWh === null) {
    return {
      deltaWh: 0n,
      isBaseline: true,
    }
  }

  if (currentCumulativeWh <= previousCumulativeWh) {
    throw new Error('Non-monotonic cumulativeWh')
  }

  return {
    deltaWh: currentCumulativeWh - previousCumulativeWh,
    isBaseline: false,
  }
}

export function normalizeReadingId(readingId: string) {
  if (/^0x[a-fA-F0-9]{64}$/.test(readingId)) {
    return readingId.toLowerCase() as `0x${string}`
  }

  return keccak256(stringToHex(readingId))
}

export function payloadHash(payload: string) {
  return `0x${createHash('sha256').update(payload).digest('hex')}` as `0x${string}`
}

export function generateCredentialPassword() {
  return randomBytes(18).toString('base64url')
}
