export type MeterPayload = {
  readingId: string
  meterId: string
  sellerWallet: string
  timestamp: string
  cumulativeWh: string | number
  sourceType: string
}

export type BrokerCredentialRecord = {
  wallet_address: string
  mqtt_username: string
  mqtt_password: string
  allowed_topic: string
  broker_url: string
  active: boolean
}
