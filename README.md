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
- Off-chain compatibility: `Supabase` (self-hosted in Docker)
- Core contracts:
  - `KWHUToken`
  - `KWHUVault`
  - `KWHUMarketplace`

The MVP should stay `mostly onchain`.

- Core financial state lives onchain.
- Marketplace settlement and order status live onchain.
- Sensitive fulfillment details remain off-platform.
- A dedicated backend is not required for the core flow.
- The repo includes a self-hosted Supabase bundle in [infra/supabase/README.md](./infra/supabase/README.md) for future off-chain data and storage needs.
- The app remains `wallet-first`; Supabase Auth is not part of the current MVP app flow.

## Getting Started

This repository currently documents the MVP scope and implementation direction.

When app development begins:

1. Copy `.env.example` to `.env`.
2. Fill in the Base RPC and deployed contract addresses.
3. Keep real secrets out of git and out of `.env.example`.

Use `.env.example` as the only committed reference for local configuration shape.

## Intentional Constraints and Tradeoffs

These choices are deliberate for the MVP:

- Do not call the product `v1`; use `MVP`.
- Do not add fiat pricing as a primary interface.
- Do not add direct fiat or crypto conversion flows.
- Do not add electricity redemption into the MVP.
- Do not add a marketplace exit flow in the MVP.
- Do not require merchant approval before listing.
- Do not require anti-sybil controls before claiming the signup grant.

The MVP also intentionally allows a pilot-stage simplification:

- KWHU issuance may happen before strict renewable-energy backing is enforced.

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
- Local implementation reference: [Base-app-get-started-guide.md](./Base-app-get-started-guide.md)
- Local source material: [KWHU - KiloWatt-Hour equivalent Unit - V1.0.pdf](./KWHU%20-%20KiloWatt-Hour%20equivalent%20Unit%20-%20V1.0.pdf)
