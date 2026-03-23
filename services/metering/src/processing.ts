import type { MeterPayload } from './types.js'
import {
  readActiveAgreementId,
  readAgreement,
  readMeter,
  settleReadingOnchain,
} from './blockchain.js'
import {
  getAgreementCache,
  insertRawMessage,
  insertSettlementAttempt,
  upsertAgreementCache,
  upsertNormalizedReading,
} from './storage.js'
import {
  computeEnergyDelta,
  normalizeCumulativeWh,
  normalizeReadingId,
  parseMeterTopic,
  payloadHash,
} from './utils.js'

const TOKEN_WEI_PER_WH = 10n ** 15n

export async function processMeterReading(topic: string, payloadText: string, payload: MeterPayload) {
  const parsedTopic = parseMeterTopic(topic)
  const readingId = normalizeReadingId(payload.readingId)
  const messageHash = payloadHash(payloadText)

  await insertRawMessage({
    readingId,
    meterId: payload.meterId,
    topic,
    payload,
  })

  if (payload.meterId.toLowerCase() !== parsedTopic.meterId) {
    await upsertNormalizedReading({
      readingId,
      meterId: payload.meterId,
      sellerWallet: payload.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh: normalizeCumulativeWh(payload.cumulativeWh),
      deltaWh: null,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: false,
      rejectionReason: 'TOPIC_METER_MISMATCH',
    })
    return
  }

  if (payload.sellerWallet.toLowerCase() !== parsedTopic.sellerWallet) {
    await upsertNormalizedReading({
      readingId,
      meterId: parsedTopic.meterId,
      sellerWallet: payload.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh: normalizeCumulativeWh(payload.cumulativeWh),
      deltaWh: null,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: false,
      rejectionReason: 'TOPIC_WALLET_MISMATCH',
    })
    return
  }

  if (payload.sourceType.toLowerCase() !== 'renewable') {
    await upsertNormalizedReading({
      readingId,
      meterId: parsedTopic.meterId,
      sellerWallet: parsedTopic.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh: normalizeCumulativeWh(payload.cumulativeWh),
      deltaWh: null,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: false,
      rejectionReason: 'UNSUPPORTED_SOURCE_TYPE',
    })
    return
  }

  const agreementId = await readActiveAgreementId(parsedTopic.meterId as `0x${string}`)
  const cumulativeWh = normalizeCumulativeWh(payload.cumulativeWh)

  if (agreementId === 0n) {
    await upsertNormalizedReading({
      readingId,
      meterId: parsedTopic.meterId,
      sellerWallet: parsedTopic.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh,
      deltaWh: null,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: false,
      rejectionReason: 'NO_ACTIVE_AGREEMENT',
    })
    await insertSettlementAttempt({
      readingId,
      agreementId: null,
      meterId: parsedTopic.meterId,
      buyerWallet: null,
      sellerWallet: parsedTopic.sellerWallet,
      energyWh: null,
      payoutWei: null,
      payloadHash: messageHash,
      status: 'rejected',
      failureReason: 'NO_ACTIVE_AGREEMENT',
      txHash: null,
    })
    return
  }

  const [agreement, meter, cachedAgreement] = await Promise.all([
    readAgreement(agreementId),
    readMeter(parsedTopic.meterId as `0x${string}`),
    getAgreementCache(agreementId),
  ])

  const cachedLastCumulativeWh =
    cachedAgreement && cachedAgreement.last_cumulative_wh !== null
      ? BigInt(String(cachedAgreement.last_cumulative_wh))
      : null

  let delta
  try {
    delta = computeEnergyDelta(cachedLastCumulativeWh, cumulativeWh)
  } catch (error) {
    const rejectionReason = error instanceof Error ? error.message : 'NON_MONOTONIC'
    await upsertNormalizedReading({
      readingId,
      meterId: parsedTopic.meterId,
      sellerWallet: parsedTopic.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh,
      deltaWh: null,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: false,
      rejectionReason,
    })
    await insertSettlementAttempt({
      readingId,
      agreementId,
      meterId: parsedTopic.meterId,
      buyerWallet: agreement.buyer,
      sellerWallet: agreement.seller,
      energyWh: null,
      payoutWei: null,
      payloadHash: messageHash,
      status: 'rejected',
      failureReason: rejectionReason,
      txHash: null,
    })
    return
  }

  await upsertAgreementCache({
    agreementId,
    meterId: parsedTopic.meterId,
    buyerWallet: agreement.buyer,
    sellerWallet: agreement.seller,
    active: agreement.active,
    endTime: new Date(Number(agreement.endTime) * 1000).toISOString(),
    totalEscrow: agreement.totalEscrow,
    remainingEscrow: agreement.remainingEscrow,
    settledEnergyWh: agreement.settledEnergyWh,
    settledAmount: agreement.settledAmount,
    lastCumulativeWh: delta.isBaseline ? cumulativeWh : cachedLastCumulativeWh,
    lastReadingId: delta.isBaseline ? readingId : cachedAgreement?.last_reading_id?.toString() || null,
  })

  if (!meter.active) {
    await upsertNormalizedReading({
      readingId,
      meterId: parsedTopic.meterId,
      sellerWallet: parsedTopic.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh,
      deltaWh: null,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: false,
      rejectionReason: 'METER_INACTIVE',
    })
    return
  }

  if (delta.isBaseline) {
    await upsertNormalizedReading({
      readingId,
      meterId: parsedTopic.meterId,
      sellerWallet: parsedTopic.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh,
      deltaWh: 0n,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: true,
      rejectionReason: null,
    })
    await insertSettlementAttempt({
      readingId,
      agreementId,
      meterId: parsedTopic.meterId,
      buyerWallet: agreement.buyer,
      sellerWallet: agreement.seller,
      energyWh: 0n,
      payoutWei: 0n,
      payloadHash: messageHash,
      status: 'baseline',
      failureReason: null,
      txHash: null,
    })
    return
  }

  const payoutWei = delta.deltaWh * TOKEN_WEI_PER_WH
  if (payoutWei > agreement.remainingEscrow) {
    await upsertNormalizedReading({
      readingId,
      meterId: parsedTopic.meterId,
      sellerWallet: parsedTopic.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh,
      deltaWh: delta.deltaWh,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: false,
      rejectionReason: 'INSUFFICIENT_ESCROW',
    })
    await insertSettlementAttempt({
      readingId,
      agreementId,
      meterId: parsedTopic.meterId,
      buyerWallet: agreement.buyer,
      sellerWallet: agreement.seller,
      energyWh: delta.deltaWh,
      payoutWei,
      payloadHash: messageHash,
      status: 'rejected',
      failureReason: 'INSUFFICIENT_ESCROW',
      txHash: null,
    })
    return
  }

  try {
    const txHash = await settleReadingOnchain({
      agreementId,
      readingId,
      energyWh: delta.deltaWh,
      readingTimestamp: Math.floor(new Date(payload.timestamp).getTime() / 1000),
      payloadHash: messageHash,
    })

    const updatedAgreement = await readAgreement(agreementId)

    await upsertNormalizedReading({
      readingId,
      meterId: parsedTopic.meterId,
      sellerWallet: parsedTopic.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh,
      deltaWh: delta.deltaWh,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: true,
      rejectionReason: null,
    })

    await upsertAgreementCache({
      agreementId,
      meterId: parsedTopic.meterId,
      buyerWallet: updatedAgreement.buyer,
      sellerWallet: updatedAgreement.seller,
      active: updatedAgreement.active,
      endTime: new Date(Number(updatedAgreement.endTime) * 1000).toISOString(),
      totalEscrow: updatedAgreement.totalEscrow,
      remainingEscrow: updatedAgreement.remainingEscrow,
      settledEnergyWh: updatedAgreement.settledEnergyWh,
      settledAmount: updatedAgreement.settledAmount,
      lastCumulativeWh: cumulativeWh,
      lastReadingId: readingId,
    })

    await insertSettlementAttempt({
      readingId,
      agreementId,
      meterId: parsedTopic.meterId,
      buyerWallet: updatedAgreement.buyer,
      sellerWallet: updatedAgreement.seller,
      energyWh: delta.deltaWh,
      payoutWei,
      payloadHash: messageHash,
      status: 'success',
      failureReason: null,
      txHash,
    })
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : 'SETTLEMENT_FAILED'

    await upsertNormalizedReading({
      readingId,
      meterId: parsedTopic.meterId,
      sellerWallet: parsedTopic.sellerWallet,
      topic,
      readingTimestamp: payload.timestamp,
      cumulativeWh,
      deltaWh: delta.deltaWh,
      sourceType: payload.sourceType,
      payloadHash: messageHash,
      accepted: false,
      rejectionReason: failureReason,
    })
    await insertSettlementAttempt({
      readingId,
      agreementId,
      meterId: parsedTopic.meterId,
      buyerWallet: agreement.buyer,
      sellerWallet: agreement.seller,
      energyWh: delta.deltaWh,
      payoutWei,
      payloadHash: messageHash,
      status: 'failed',
      failureReason,
      txHash: null,
    })
  }
}
