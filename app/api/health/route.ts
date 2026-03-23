import { NextResponse } from 'next/server'

import {
  contractAddresses,
  deploymentChain,
  hasConfiguredContracts,
  hasConfiguredEnergyContract,
} from '@/config/contracts'

export function GET() {
  return NextResponse.json({
    app: process.env.NEXT_PUBLIC_APP_NAME || 'KWHU MVP',
    chainId: deploymentChain.id,
    contractsConfigured: hasConfiguredContracts,
    energyConfigured: hasConfiguredEnergyContract,
    contracts: contractAddresses,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    meteringServiceUrl: process.env.NEXT_PUBLIC_METERING_SERVICE_URL || null,
    mqttBrokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL || null,
  })
}
