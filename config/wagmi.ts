import { createConfig, createStorage, cookieStorage, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { baseAccount, injected } from 'wagmi/connectors'

import { defaultBaseRpcUrl } from '@/config/contracts'

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'KWHU MVP'

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    baseAccount({
      appName,
    }),
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || defaultBaseRpcUrl),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
