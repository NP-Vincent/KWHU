# KWHU MVP Marketplace and Vault on Base Mainnet

## Summary

- Build a wallet-first KWHU marketplace MVP on `Base Mainnet` using `Next.js`, `wagmi`, and `viem`, following the Base guide in the repo as the app foundation.
- Center the product on three user flows: claim `user credit` from the foundation vault, list goods/services priced only in `KWHU`, and complete escrowed purchases with buyer-confirmed release.
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
- Keep the app `mostly onchain`.
  - No required application backend for core marketplace operation.
  - The web app reads chain state directly and submits transactions from the connected wallet.
  - Store settlement-critical marketplace state onchain.
  - Keep private fulfillment details off-platform.
  - Use referenced metadata only for non-sensitive extended listing content if needed.
- Build a `wallet-first web app` from the Base tutorial shape.
  - Support Base smart wallet and injected wallet connection patterns from the Markdown guide.
  - Include screens for claim, wallet balance, browse listings, create listing, checkout, order status, buyer confirmation, dispute status, and admin controls.

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
- Core onchain records
  - `Listing`: seller, type (`goods|services`), price in KWHU, quantity/availability, active flag, timestamps, optional metadata reference
  - `Order`: buyer, seller, listing reference, amount, escrowed balance, status, timestamps
  - `Dispute`: order reference, opened flag, resolution status, admin outcome

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
- Run manual acceptance scenarios with multiple wallets to confirm open-beta liquidity behavior: claim, list, buy, fulfill, confirm, dispute.

## Assumptions and Defaults

- `MVP` is the correct label; do not use `v1`.
- Pilot issuance is intentionally allowed before strict renewable-energy backing, even though that diverges from the long-term standards language on the KWHU website.
- There is `no electricity redemption` and `no exit flow` in the MVP.
- `User credit` in this MVP is a non-repayable onboarding allocation, not debt.
- Launch is intentionally `Base Mainnet`, `open public beta`, `any new wallet`, and `accepted farming risk`.
- Seller access is open to any wallet; there is no merchant approval gate in the MVP.
- Physical delivery or service fulfillment coordination happens off-platform; only financial and status state is onchain.
- Admin scope is limited to pause controls, disputes, and grant controls.
