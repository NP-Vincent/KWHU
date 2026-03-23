import 'dotenv/config'

import { createPublicClient, createWalletClient, http, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

function required(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function requiredAddress(name: string) {
  const value = required(name)
  if (!isAddress(value)) {
    throw new Error(`Invalid address for ${name}`)
  }
  return value
}

export const config = {
  port: Number(process.env.METERING_SERVICE_PORT || 4100),
  allowedOrigin: process.env.METERING_SERVICE_ALLOWED_ORIGIN || 'http://localhost:3000',
  publicBrokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'mqtts://localhost:8883',
  baseRpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
  tokenAddress: requiredAddress('NEXT_PUBLIC_KWHU_TOKEN_ADDRESS'),
  vaultAddress: requiredAddress('NEXT_PUBLIC_KWHU_VAULT_ADDRESS'),
  energySettlementAddress: requiredAddress('NEXT_PUBLIC_KWHU_ENERGY_SETTLEMENT_ADDRESS'),
  meteringOperatorPrivateKey: required('METERING_OPERATOR_PRIVATE_KEY') as `0x${string}`,
  supabaseUrl: process.env.METERING_SUPABASE_URL || required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  mqttBrokerHost: process.env.MQTT_BROKER_HOST || 'mosquitto',
  mqttBrokerPort: Number(process.env.MQTT_BROKER_PORT || 8883),
  mqttCaCertPath: process.env.MQTT_CA_CERT_PATH || '/shared/mosquitto/certs/ca.crt',
  mqttAdminUsername: process.env.MQTT_DYNSEC_ADMIN_USERNAME || 'kwhu-admin',
  mqttAdminPassword: required('MQTT_DYNSEC_ADMIN_PASSWORD'),
  mqttServiceUsername: process.env.MQTT_SERVICE_USERNAME || 'kwhu-metering-service',
  mqttServicePassword: required('MQTT_SERVICE_PASSWORD'),
}

export const meteringAccount = privateKeyToAccount(config.meteringOperatorPrivateKey)

export const publicClient = createPublicClient({
  chain: base,
  transport: http(config.baseRpcUrl),
})

export const walletClient = createWalletClient({
  account: meteringAccount,
  chain: base,
  transport: http(config.baseRpcUrl),
})
