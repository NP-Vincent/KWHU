import { BrokerCredentialsCard } from '@/components/broker-credentials-card'
import { ClaimVaultCard } from '@/components/claim-vault-card'
import { ConnectWallet } from '@/components/connect-wallet'
import { CreateListingCard } from '@/components/create-listing-card'
import { CreateEnergyAgreementCard } from '@/components/create-energy-agreement-card'
import { EnergyActivityCard } from '@/components/energy-activity-card'
import { EnergyAgreementLookupCard } from '@/components/energy-agreement-lookup-card'
import { MarketplaceSnapshot } from '@/components/marketplace-snapshot'
import { NetworkReference } from '@/components/network-reference'
import { OrderLifecycle } from '@/components/order-lifecycle'
import { RegisterMeterCard } from '@/components/register-meter-card'

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Base Mainnet Marketplace + Metering</p>
          <h1>KWHU starts with the vault, then earns trust in trade.</h1>
          <p className="hero-text">
            This app shell follows the repository MVP: wallet-first onboarding,
            controlled KWHU movement, escrowed goods and services priced only in
            KWHU, and prepaid renewable energy settlement over MQTT.
          </p>
          <div className="hero-grid">
            <div className="metric-card">
              <span className="metric-label">Default grant</span>
              <strong>100 KWHU</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Marketplace fee</span>
              <strong>0.5%</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Transfer policy</span>
              <strong>Marketplace only</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">Meter settlement</span>
              <strong>1 KWHU = 1 kWh</strong>
            </div>
          </div>
        </div>
        <ConnectWallet />
      </section>

      <section className="content-grid">
        <ClaimVaultCard />
        <MarketplaceSnapshot />
      </section>

      <section className="content-grid">
        <CreateListingCard />
        <OrderLifecycle />
      </section>

      <section className="content-grid">
        <RegisterMeterCard />
        <BrokerCredentialsCard />
      </section>

      <section className="content-grid">
        <CreateEnergyAgreementCard />
        <EnergyAgreementLookupCard />
      </section>

      <section className="content-grid single-column">
        <EnergyActivityCard />
      </section>

      <section className="content-grid single-column">
        <NetworkReference />
      </section>
    </main>
  )
}
