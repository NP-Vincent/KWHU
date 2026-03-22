'use client'

import { useReadContract } from 'wagmi'

import {
  contractAddresses,
  deploymentChain,
  marketplaceAbi,
} from '@/config/contracts'

export function MarketplaceSnapshot() {
  const listingCount = useReadContract({
    address: contractAddresses.marketplace,
    abi: marketplaceAbi,
    functionName: 'nextListingId',
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.marketplace),
    },
  })

  const orderCount = useReadContract({
    address: contractAddresses.marketplace,
    abi: marketplaceAbi,
    functionName: 'nextOrderId',
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.marketplace),
    },
  })

  const fulfillmentTimeout = useReadContract({
    address: contractAddresses.marketplace,
    abi: marketplaceAbi,
    functionName: 'fulfillmentTimeout',
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.marketplace),
    },
  })

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Onchain Snapshot</span>
          <h2>Read the marketplace state directly from Base.</h2>
        </div>
        <span className="status-pill muted">Mostly onchain</span>
      </div>

      <div className="market-grid">
        <div className="stat-tile">
          <span>Listings created</span>
          <strong className="stat-value">
            {listingCount.data?.toString() || '0'}
          </strong>
        </div>
        <div className="stat-tile">
          <span>Orders opened</span>
          <strong className="stat-value">{orderCount.data?.toString() || '0'}</strong>
        </div>
        <div className="stat-tile">
          <span>Fulfillment timeout</span>
          <strong className="stat-value">
            {fulfillmentTimeout.data?.toString() || '--'}s
          </strong>
        </div>
        <div className="stat-tile">
          <span>Settlement model</span>
          <strong className="stat-value">Escrow</strong>
        </div>
      </div>

      <p className="status-note">
        The web app reads listings, orders, and settlement status straight from
        the contracts. Supabase remains available for future offchain profiles,
        richer listing details, and moderation support if we decide we need it.
      </p>
    </section>
  )
}
