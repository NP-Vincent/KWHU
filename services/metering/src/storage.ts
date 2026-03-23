import type { BrokerCredentialRecord } from './types.js'
import { supabaseAdmin } from './supabase.js'

function maybeSingle<T>(value: T[] | null) {
  return value && value.length > 0 ? value[0] : null
}

export async function getBrokerCredential(walletAddress: string) {
  const { data, error } = await supabaseAdmin
    .from('meter_broker_credentials')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .limit(1)

  if (error) {
    throw error
  }

  return maybeSingle(data as BrokerCredentialRecord[] | null)
}

export async function upsertBrokerCredential(record: BrokerCredentialRecord) {
  const { error } = await supabaseAdmin.from('meter_broker_credentials').upsert(
    {
      ...record,
      wallet_address: record.wallet_address.toLowerCase(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'wallet_address' },
  )

  if (error) {
    throw error
  }
}

export async function upsertMeterRegistration(record: {
  meterId: string
  sellerWallet: string
  metadataURI: string
  sourceType: string
  active: boolean
}) {
  const { error } = await supabaseAdmin.from('meter_registrations').upsert(
    {
      meter_id: record.meterId.toLowerCase(),
      seller_wallet: record.sellerWallet.toLowerCase(),
      metadata_uri: record.metadataURI,
      source_type: record.sourceType,
      active: record.active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'meter_id' },
  )

  if (error) {
    throw error
  }
}

export async function insertRawMessage(record: {
  readingId: string | null
  meterId: string | null
  topic: string
  payload: unknown
}) {
  const { error } = await supabaseAdmin.from('mqtt_raw_messages').insert({
    reading_id: record.readingId,
    meter_id: record.meterId,
    topic: record.topic,
    payload: record.payload,
  })

  if (error) {
    throw error
  }
}

export async function upsertNormalizedReading(record: {
  readingId: string
  meterId: string
  sellerWallet: string
  topic: string
  readingTimestamp: string
  cumulativeWh: bigint
  deltaWh: bigint | null
  sourceType: string
  payloadHash: string
  accepted: boolean
  rejectionReason: string | null
}) {
  const { error } = await supabaseAdmin.from('normalized_meter_readings').upsert(
    {
      reading_id: record.readingId,
      meter_id: record.meterId,
      seller_wallet: record.sellerWallet.toLowerCase(),
      topic: record.topic,
      reading_timestamp: record.readingTimestamp,
      cumulative_wh: record.cumulativeWh.toString(),
      delta_wh: record.deltaWh === null ? null : record.deltaWh.toString(),
      source_type: record.sourceType,
      payload_hash: record.payloadHash,
      accepted: record.accepted,
      rejection_reason: record.rejectionReason,
    },
    { onConflict: 'reading_id' },
  )

  if (error) {
    throw error
  }
}

export async function getAgreementCache(agreementId: bigint) {
  const { data, error } = await supabaseAdmin
    .from('energy_agreements_cache')
    .select('*')
    .eq('agreement_id', Number(agreementId))
    .limit(1)

  if (error) {
    throw error
  }

  return maybeSingle(data as Record<string, unknown>[] | null)
}

export async function upsertAgreementCache(record: {
  agreementId: bigint
  meterId: string
  buyerWallet: string
  sellerWallet: string
  active: boolean
  endTime: string
  totalEscrow: bigint
  remainingEscrow: bigint
  settledEnergyWh: bigint
  settledAmount: bigint
  lastCumulativeWh?: bigint | null
  lastReadingId?: string | null
}) {
  const { error } = await supabaseAdmin.from('energy_agreements_cache').upsert(
    {
      agreement_id: Number(record.agreementId),
      meter_id: record.meterId.toLowerCase(),
      buyer_wallet: record.buyerWallet.toLowerCase(),
      seller_wallet: record.sellerWallet.toLowerCase(),
      active: record.active,
      end_time: record.endTime,
      total_escrow: record.totalEscrow.toString(),
      remaining_escrow: record.remainingEscrow.toString(),
      settled_energy_wh: record.settledEnergyWh.toString(),
      settled_amount: record.settledAmount.toString(),
      last_cumulative_wh:
        record.lastCumulativeWh === undefined || record.lastCumulativeWh === null
          ? null
          : record.lastCumulativeWh.toString(),
      last_reading_id: record.lastReadingId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agreement_id' },
  )

  if (error) {
    throw error
  }
}

export async function insertSettlementAttempt(record: {
  readingId: string
  agreementId: bigint | null
  meterId: string
  buyerWallet: string | null
  sellerWallet: string
  energyWh: bigint | null
  payoutWei: bigint | null
  payloadHash: string
  status: string
  failureReason: string | null
  txHash: string | null
}) {
  const { error } = await supabaseAdmin.from('energy_settlement_attempts').insert({
    reading_id: record.readingId,
    agreement_id: record.agreementId === null ? null : Number(record.agreementId),
    meter_id: record.meterId.toLowerCase(),
    buyer_wallet: record.buyerWallet?.toLowerCase() || null,
    seller_wallet: record.sellerWallet.toLowerCase(),
    energy_wh: record.energyWh === null ? null : record.energyWh.toString(),
    payout_wei: record.payoutWei === null ? null : record.payoutWei.toString(),
    payload_hash: record.payloadHash,
    status: record.status,
    failure_reason: record.failureReason,
    tx_hash: record.txHash,
  })

  if (error) {
    throw error
  }
}

export async function listWalletActivity(walletAddress: string) {
  const normalizedWallet = walletAddress.toLowerCase()

  const [meters, agreements, readings, settlements] = await Promise.all([
    supabaseAdmin
      .from('meter_registrations')
      .select('*')
      .eq('seller_wallet', normalizedWallet)
      .order('updated_at', { ascending: false }),
    supabaseAdmin
      .from('energy_agreements_cache')
      .select('*')
      .or(`buyer_wallet.eq.${normalizedWallet},seller_wallet.eq.${normalizedWallet}`)
      .order('updated_at', { ascending: false }),
    supabaseAdmin
      .from('normalized_meter_readings')
      .select('*')
      .eq('seller_wallet', normalizedWallet)
      .order('created_at', { ascending: false })
      .limit(25),
    supabaseAdmin
      .from('energy_settlement_attempts')
      .select('*')
      .or(`buyer_wallet.eq.${normalizedWallet},seller_wallet.eq.${normalizedWallet}`)
      .order('created_at', { ascending: false })
      .limit(25),
  ])

  for (const result of [meters, agreements, readings, settlements]) {
    if (result.error) {
      throw result.error
    }
  }

  return {
    meters: meters.data || [],
    agreements: agreements.data || [],
    readings: readings.data || [],
    settlements: settlements.data || [],
  }
}
