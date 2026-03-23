import express from 'express'
import cors from 'cors'
import { isAddress } from 'viem'

import {
  readAgreement,
  readMeter,
  verifyWalletAction,
  walletIsEligibleForBrokerCredentials,
} from './blockchain.js'
import { config } from './config.js'
import { ensureWalletPublisherAccess } from './mosquitto.js'
import { listWalletActivity, upsertAgreementCache, upsertBrokerCredential, upsertMeterRegistration, getBrokerCredential } from './storage.js'
import { createPublisherTopicPattern, generateCredentialPassword } from './utils.js'

type SignedRequest = {
  walletAddress?: string
  issuedAt?: string
  signature?: `0x${string}`
}

function ensureSignedRequest(body: SignedRequest) {
  if (!body.walletAddress || !body.issuedAt || !body.signature) {
    throw new Error('walletAddress, issuedAt, and signature are required')
  }
  if (!isAddress(body.walletAddress)) {
    throw new Error('Invalid walletAddress')
  }

  return {
    walletAddress: body.walletAddress.toLowerCase() as `0x${string}`,
    issuedAt: body.issuedAt,
    signature: body.signature,
  }
}

export function createApiServer() {
  const app = express()

  app.use(cors({ origin: config.allowedOrigin }))
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({
      service: 'kwhu-metering-service',
      brokerHost: config.mqttBrokerHost,
      brokerPort: config.mqttBrokerPort,
    })
  })

  app.post('/api/broker-credentials', async (req, res) => {
    try {
      const signed = ensureSignedRequest(req.body)
      const verified = await verifyWalletAction(
        'broker-credentials',
        signed.walletAddress,
        signed.issuedAt,
        signed.signature,
      )

      if (!verified) {
        return res.status(401).json({ error: 'Invalid wallet signature' })
      }

      const eligible = await walletIsEligibleForBrokerCredentials(signed.walletAddress)
      if (!eligible) {
        return res.status(403).json({ error: 'Wallet is not eligible for broker credentials' })
      }

      const existing = await getBrokerCredential(signed.walletAddress)
      if (existing) {
        return res.json(existing)
      }

      const username = `wallet-${signed.walletAddress.slice(2)}`
      const password = generateCredentialPassword()
      const allowedTopic = createPublisherTopicPattern(signed.walletAddress)

      await ensureWalletPublisherAccess(signed.walletAddress, username, password, allowedTopic)
      await upsertBrokerCredential({
        wallet_address: signed.walletAddress,
        mqtt_username: username,
        mqtt_password: password,
        allowed_topic: allowedTopic,
        broker_url: config.publicBrokerUrl,
        active: true,
      })

      return res.json({
        wallet_address: signed.walletAddress,
        mqtt_username: username,
        mqtt_password: password,
        allowed_topic: allowedTopic,
        broker_url: config.publicBrokerUrl,
        active: true,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Broker credential request failed'
      return res.status(500).json({ error: message })
    }
  })

  app.post('/api/meters/sync', async (req, res) => {
    try {
      const signed = ensureSignedRequest(req.body)
      const meterId = String(req.body.meterId || '').toLowerCase()
      const metadataURI = String(req.body.metadataURI || '')
      const sourceType = String(req.body.sourceType || '').toLowerCase()

      const verified = await verifyWalletAction(
        'meter-sync',
        signed.walletAddress,
        signed.issuedAt,
        signed.signature,
      )
      if (!verified) {
        return res.status(401).json({ error: 'Invalid wallet signature' })
      }

      const meter = await readMeter(meterId as `0x${string}`)
      if (meter.owner.toLowerCase() !== signed.walletAddress) {
        return res.status(403).json({ error: 'Wallet does not own this meter onchain' })
      }

      await upsertMeterRegistration({
        meterId,
        sellerWallet: signed.walletAddress,
        metadataURI: metadataURI || meter.metadataURI,
        sourceType: sourceType || meter.sourceType,
        active: meter.active,
      })

      return res.json({ ok: true, meterId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Meter sync failed'
      return res.status(500).json({ error: message })
    }
  })

  app.post('/api/agreements/sync', async (req, res) => {
    try {
      const signed = ensureSignedRequest(req.body)
      const agreementId = BigInt(req.body.agreementId)

      const verified = await verifyWalletAction(
        'agreement-sync',
        signed.walletAddress,
        signed.issuedAt,
        signed.signature,
      )
      if (!verified) {
        return res.status(401).json({ error: 'Invalid wallet signature' })
      }

      const agreement = await readAgreement(agreementId)
      if (
        agreement.buyer.toLowerCase() !== signed.walletAddress &&
        agreement.seller.toLowerCase() !== signed.walletAddress
      ) {
        return res.status(403).json({ error: 'Wallet is not a participant in this agreement' })
      }

      await upsertAgreementCache({
        agreementId,
        meterId: agreement.meterId.toLowerCase(),
        buyerWallet: agreement.buyer,
        sellerWallet: agreement.seller,
        active: agreement.active,
        endTime: new Date(Number(agreement.endTime) * 1000).toISOString(),
        totalEscrow: agreement.totalEscrow,
        remainingEscrow: agreement.remainingEscrow,
        settledEnergyWh: agreement.settledEnergyWh,
        settledAmount: agreement.settledAmount,
      })

      return res.json({ ok: true, agreementId: agreementId.toString() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agreement sync failed'
      return res.status(500).json({ error: message })
    }
  })

  app.get('/api/readings', async (req, res) => {
    try {
      const walletAddress = String(req.query.walletAddress || '').toLowerCase()
      if (!isAddress(walletAddress)) {
        return res.status(400).json({ error: 'walletAddress query param is required' })
      }

      const activity = await listWalletActivity(walletAddress)
      return res.json(activity)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load activity'
      return res.status(500).json({ error: message })
    }
  })

  return app
}
