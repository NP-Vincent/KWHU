# KWHU MVP Marketplace and Vault on Base Mainnet

## Summary

- Build a wallet-first KWHU marketplace MVP on `Base Mainnet` using `Next.js`, `wagmi`, and `viem`, following the Base guide in the repo as the app foundation.
- Center the product on three user flows: claim `user credit` from the foundation vault, list goods/services priced only in `KWHU`, and complete escrowed purchases with buyer-confirmed release.
- Add a dedicated `metered renewable energy settlement` flow using `MQTT + Mosquitto`, a separate metering service, and prepaid buyer-seller agreements.
- Optimize for `marketplace liquidity`: real listings, real purchases, and visible circulation of KWHU inside the marketplace economy.
- Intentionally launch as an `open public beta`: any new wallet can claim a one-time signup grant, and grant farming risk is accepted for the pilot.

## Key Changes

- Create a `controlled ERC-20 KWHU token` on Base Mainnet.
  - Minting is limited to the foundation vault.
  - Direct peer-to-peer transfers are blocked.
  - User movement of KWHU happens only through the marketplace contract.
- Create a `foundation vault` contract for user credit.
  - `claimSignupGrant()` grants a one-time onboarding allocation to any wallet.
  - Default grant is `100 KWHU`.
  - Grant amount is admin-configurable.
  - The vault also supports admin grant controls and global pause controls.
- Create a `marketplace escrow` contract.
  - Any wallet can create listings.
  - Support both `goods` and `services`.
  - Listings are priced in `KWHU` only, with no fiat reference in the interface.
  - Purchases lock buyer funds in escrow.
  - Sellers mark orders fulfilled.
  - Buyers confirm completion to release payment.
  - If the buyer does not act before the deadline, the order moves to admin dispute review.
  - Completed payouts deduct a fixed `0.5%` marketplace fee.
- Create a dedicated `energy settlement` contract.
  - Meter readings do not mint new KWHU.
  - A buyer prefunds a prepaid agreement for a seller-owned renewable meter.
  - The metering service settles verified readings at `1 KWHU = 1 kWh`.
  - Meter settlements charge `no additional fee` in the MVP.
- Keep the app `mostly onchain`.
  - No required application backend for core marketplace operation.
  - The web app reads chain state directly and submits transactions from the connected wallet.
  - Store settlement-critical marketplace state onchain.
  - Store meter agreements and escrow settlement state onchain.
  - Keep private fulfillment details off-platform.
  - Use referenced metadata only for non-sensitive extended listing content if needed.
- Build a `wallet-first web app` from the Base tutorial shape.
  - Support Base smart wallet and injected wallet connection patterns from the Markdown guide.
  - Include screens for claim, wallet balance, browse listings, create listing, checkout, order status, buyer confirmation, dispute status, and admin controls.
  - Include screens for meter registration, broker credentials, energy agreement creation, agreement lookup, and reading/settlement history.
- Add a dedicated `metering service`.
  - Use `mqtt` for broker subscription.
  - Use `viem` for Base reads and writes.
  - Use self-hosted Supabase for raw payload, normalized reading, and settlement audit records.

## Public Interfaces and Types

- `KWHUToken`
  - `mint(address to, uint256 amount)` callable only by vault authority
  - restricted `transfer/transferFrom` rules so only approved marketplace flows succeed
  - `pause()` / `unpause()`
- `KWHUVault`
  - `claimSignupGrant()`
  - `grantTo(address to, uint256 amount)` for admin grant controls
  - `setSignupGrantAmount(uint256 amount)`
  - `hasClaimed(address wallet) -> bool`
- `KWHUMarketplace`
  - `createListing(...)`
  - `updateListing(...)`
  - `deactivateListing(uint256 listingId)`
  - `purchase(uint256 listingId, uint256 quantity)`
  - `markFulfilled(uint256 orderId)`
  - `confirmFulfillment(uint256 orderId)`
  - `openDispute(uint256 orderId, string reason)`
  - `resolveDispute(uint256 orderId, resolution)`
- `KWHUEnergySettlement`
  - `registerMeter(bytes32 meterId, string metadataURI, string sourceType)`
  - `setMeterActive(bytes32 meterId, bool active)`
  - `createAgreement(bytes32 meterId, uint256 escrowAmount, uint64 endTime)`
  - `topUpAgreement(uint256 agreementId, uint256 amount)`
  - `closeAgreement(uint256 agreementId)`
  - `settleReading(uint256 agreementId, bytes32 readingId, uint256 energyWh, uint64 readingTimestamp, bytes32 payloadHash)`
  - `getActiveAgreementId(bytes32 meterId)`
- Core onchain records
  - `Listing`: seller, type (`goods|services`), price in KWHU, quantity/availability, active flag, timestamps, optional metadata reference
  - `Order`: buyer, seller, listing reference, amount, escrowed balance, status, timestamps
  - `Dispute`: order reference, opened flag, resolution status, admin outcome
  - `Meter`: owner, metadata reference, source type, active flag
  - `EnergyAgreement`: buyer, seller, meter, total escrow, remaining escrow, settled energy, end time, active flag

## Test Plan

- Verify any new wallet can claim the signup grant exactly once, and repeat claims fail.
- Verify the default grant is `100 KWHU` and admin updates affect future claims only.
- Verify KWHU cannot move by direct wallet-to-wallet transfer.
- Verify a buyer can purchase a listing only through the marketplace escrow path.
- Verify seller fulfillment, buyer confirmation, and `0.5%` fee deduction release the correct amounts.
- Verify buyer inactivity moves the order into admin review after the deadline.
- Verify admin dispute resolution can release to seller, refund buyer, or otherwise finalize according to the chosen dispute outcome model.
- Verify pause controls stop claiming, listing, and purchase flows.
- Verify listings and orders support both goods and services while keeping delivery details off-platform.
- Verify a buyer can create, top up, and close an energy agreement without minting new supply.
- Verify duplicate readings are rejected and settlement cannot exceed remaining escrow.
- Verify the metering service stores raw MQTT messages, normalized readings, and settlement attempts in Supabase.
- Run manual acceptance scenarios with multiple wallets to confirm open-beta liquidity behavior: claim, list, buy, fulfill, confirm, dispute.
- Run end-to-end acceptance scenarios for MQTT settlement: register meter, issue broker credentials, fund agreement, publish readings, settle to seller, top up, close, and ignore post-close readings.

## Assumptions and Defaults

- `MVP` is the correct label; do not use `v1`.
- Pilot issuance is intentionally allowed before strict renewable-energy backing, even though that diverges from the long-term standards language on the KWHU website.
- There is `no electricity redemption` and `no exit flow` in the MVP.
- Meter readings are a `settlement path`, not a `mint path`.
- `User credit` in this MVP is a non-repayable onboarding allocation, not debt.
- Launch is intentionally `Base Mainnet`, `open public beta`, `any new wallet`, and `accepted farming risk`.
- Seller access is open to any wallet; there is no merchant approval gate in the MVP.
- Physical delivery or service fulfillment coordination happens off-platform; only financial and status state is onchain.
- Admin scope is limited to pause controls, disputes, and grant controls.
- Meter registration is auto-approved and renewable qualification is self-attested during the pilot.
