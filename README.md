# KWHU MVP

KWHU is an energy-denominated marketplace model where `1 KWHU = 1 kWh`, and value is intended to emerge from real trade between participants rather than a fiat peg or external oracle.

This repository defines an MVP for a wallet-first KWHU marketplace on Base. The product centers on a foundation-operated vault, onchain KWHU balances, and a marketplace that helps discover the value of KWHU through goods and services priced directly in KWHU terms.

## MVP Summary

- Build on `Base Mainnet`.
- Use a `wallet-first` experience.
- Launch as an `open public beta`.
- Issue KWHU through a `foundation vault`.
- Represent KWHU as a `controlled ERC-20`.
- Restrict KWHU movement to `marketplace flows only`.
- Price listings in `KWHU only`.
- Support `goods and services`.
- Support `metered renewable energy settlement`.
- Use `escrow until fulfillment`.
- Release escrow on `buyer confirmation`.
- Route inactive or contested orders to `admin dispute review`.
- Deduct a fixed `0.5%` marketplace fee on completed releases.

## Product Shape

### Foundation Vault and User Credit

The foundation vault is the source of user credit in the MVP.

- Any new wallet can claim a one-time signup grant.
- The default signup grant is `100 KWHU`.
- The grant amount is admin-configurable.
- For the MVP, this user credit is a `non-repayable allocation`.
- Grant farming risk is intentionally accepted for the pilot.

### Marketplace

The marketplace is the core venue for KWHU circulation and early price discovery.

- Any wallet can create listings.
- Listings are priced in `KWHU only`.
- The marketplace supports both `goods` and `services`.
- Physical delivery or service fulfillment details are handled `off-platform`.
- The app records payment and status, while private fulfillment coordination stays outside the chain.

### Metered Energy Settlement

The MVP also supports prepaid electricity settlement between a buyer and a seller-owned renewable meter.

- Meter readings do `not mint` new KWHU.
- A buyer funds a prepaid energy agreement in KWHU.
- Verified renewable readings release KWHU from escrow to the seller at `1 KWHU = 1 kWh`.
- MQTT and Mosquitto provide the meter-ingestion layer.
- A dedicated metering service stores raw payloads, normalized readings, and settlement attempts in Supabase.

### Token and Transfer Model

KWHU is planned as a controlled ERC-20 on Base Mainnet.

- Minting is limited to the foundation vault.
- Direct peer-to-peer transfers are blocked.
- Users move KWHU through the marketplace contract rather than arbitrary wallet transfers.
- The token exists to support marketplace activity, not open external exchange.

## Core User Flows

### 1. Claim User Credit

1. A user connects a wallet.
2. If the wallet has not claimed before, it can claim the signup grant.
3. The wallet receives `100 KWHU` by default.

### 2. Create a Listing

1. A seller connects a wallet.
2. The seller creates a listing for a good or service.
3. The listing is priced only in `KWHU`.

### 3. Buy Through Escrow

1. A buyer selects a listing.
2. The marketplace contract locks the buyer's KWHU in escrow.
3. The seller fulfills the order.
4. The buyer confirms completion.
5. The contract releases payment to the seller and deducts the `0.5%` fee.

### 4. Resolve a Dispute

1. If the buyer does not confirm in time, the order moves into review.
2. Admins can review and resolve the order.
3. Admin scope is limited to pause controls, disputes, and grant controls.

## Architecture

The implementation is expected to use the Base app guidance already present in this repository.

- Frontend: `Next.js`
- Wallet integration: `wagmi` + `viem`
- Chain: `Base Mainnet`
- Base developer reference: `https://docs.base.org/llms-full.txt`
- Off-chain compatibility: `Supabase` (self-hosted in Docker)
- Meter-ingestion layer: `Mosquitto` + `MQTT`
- Meter settlement backend: `Node.js` + `TypeScript` + `mqtt` + `viem`
- Core contracts:
  - `KWHUToken`
  - `KWHUVault`
  - `KWHUMarketplace`
  - `KWHUEnergySettlement`

The MVP should stay `mostly onchain`.

- Core financial state lives onchain.
- Marketplace settlement and order status live onchain.
- Metered energy agreements and escrow settlement live onchain.
- Sensitive fulfillment details remain off-platform.
- A dedicated metering backend is required for MQTT ingestion, broker credential provisioning, and settlement execution.
- The repo includes a self-hosted Supabase bundle in [infra/supabase/README.md](./infra/supabase/README.md) for future off-chain data and storage needs.
- The repo includes a dedicated Mosquitto runtime in [infra/mosquitto/README.md](./infra/mosquitto/README.md).
- The app remains `wallet-first`; Supabase Auth is not part of the current MVP app flow.

## Getting Started

This repository currently documents the MVP scope and implementation direction.

When app development begins:

1. Copy `.env.example` to `.env`.
2. Fill in the Base RPC and deployed contract addresses.
3. Keep real secrets out of git and out of `.env.example`.

Use `.env.example` as the only committed reference for local configuration shape.

The repo now includes an initial Next.js app scaffold with:

- `wagmi` + `viem` wallet and contract wiring
- Base Mainnet as the default chain target
- a wallet connection panel
- a vault grant claim flow
- a marketplace snapshot section
- a first listing-creation form
- meter registration and broker credential request flows
- prepaid energy agreement creation and lookup flows
- wallet-level reading and settlement history from Supabase
- and a simple health endpoint at `/api/health`

To work with the app locally:

1. Run `npm install` if you are using a local Node runtime, or use Docker with the included `Dockerfile`.
2. Start the app with `npm run dev`, or use `docker compose up app` after creating `.env`.
3. Open `http://localhost:3000`.

For the metering runtime:

1. Start the self-hosted Supabase stack from `infra/supabase/`.
2. Use the repo root `docker-compose.yml` to run `app`, `mosquitto`, and `metering-service`.
3. Request MQTT credentials from the app after a wallet has received KWHU credit.

## Intentional Constraints and Tradeoffs

These choices are deliberate for the MVP:

- Do not call the product `v1`; use `MVP`.
- Do not add fiat pricing as a primary interface.
- Do not add direct fiat or crypto conversion flows.
- Do not add electricity redemption into the MVP.
- Do not add a marketplace exit flow in the MVP.
- Do not require merchant approval before listing.
- Do not require anti-sybil controls before claiming the signup grant.
- Do not treat meter readings as a mint path for new KWHU supply.

The MVP also intentionally allows a pilot-stage simplification:

- KWHU issuance may happen before strict renewable-energy backing is enforced.
- Meter registration is auto-approved and renewable qualification is self-attested for the pilot.

This is a pilot tradeoff, not the long-term policy intent described by the KWHU Foundation materials.

## Success Criteria

The primary success criterion for the MVP is `marketplace liquidity`.

That means the product should support:

- real listings,
- real purchases,
- visible circulation of KWHU,
- and repeat marketplace use inside the KWHU economy.

## References

- Website: [kwhufoundation.com](https://kwhufoundation.com)
- Detailed implementation plan: [PLAN.md](./PLAN.md)
- Base static docs reference: [docs.base.org/llms-full.txt](https://docs.base.org/llms-full.txt)
- Base MCP setup reference: [docs.base.org/get-started/docs-mcp](https://docs.base.org/get-started/docs-mcp)
- Local implementation reference: [Base-app-get-started-guide.md](./Base-app-get-started-guide.md)
- Local Mosquitto runtime reference: [infra/mosquitto/README.md](./infra/mosquitto/README.md)
- Local source material: [KWHU - KiloWatt-Hour equivalent Unit - V1.0.pdf](./KWHU%20-%20KiloWatt-Hour%20equivalent%20Unit%20-%20V1.0.pdf)
