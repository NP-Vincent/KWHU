import { NextResponse } from 'next/server'

import { contractAddresses, deploymentChain, hasConfiguredContracts } from '@/config/contracts'

export function GET() {
  return NextResponse.json({
    app: process.env.NEXT_PUBLIC_APP_NAME || 'KWHU MVP',
    chainId: deploymentChain.id,
    contractsConfigured: hasConfiguredContracts,
    contracts: contractAddresses,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
  })
}
