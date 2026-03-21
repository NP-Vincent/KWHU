# AGENTS Guide

This repository is for the `KWHU MVP`, not a generic Base demo app.

Future contributors and coding agents should treat [README.md](./README.md) as the current source of truth for product scope and implementation intent.

Use [PLAN.md](./PLAN.md) for the detailed implementation blueprint behind that scope.

## Project Intent

KWHU is being planned as an energy-denominated marketplace economy where value emerges from real trade in KWHU terms.

For this repository, the MVP is:

- a `wallet-first` product,
- on `Base Mainnet`,
- with a `foundation-operated vault`,
- a `controlled ERC-20 KWHU`,
- and a marketplace that supports `goods and services` through `escrowed KWHU payments`.

This repo is not currently centered on:

- fiat conversion,
- electricity redemption,
- merchant-custody flows,
- or a generic counter/tally example.

## Working Rules

- Use `MVP`, not `v1`.
- Keep listing prices in `KWHU only`.
- Keep KWHU movement constrained to approved marketplace flows.
- Do not introduce direct wallet-to-wallet KWHU transfer as normal behavior.
- Do not add fiat or crypto withdrawal flows unless the README is updated first.
- Do not add electricity redemption into the MVP unless the README is updated first.
- Treat fulfillment and delivery coordination as off-platform unless the README changes.
- Assume open listing access: any wallet may list goods or services.
- Assume open signup access: any new wallet may claim the one-time user credit grant.

## Implementation Bias

Unless the README changes, prefer:

- `Next.js` for the app surface,
- `wagmi` and `viem` for wallet and contract interaction,
- `Base Mainnet` as the deployment target,
- `mostly onchain` marketplace state,
- and minimal backend requirements for the core product flow.

The current contract split should generally stay close to:

- `KWHUToken` for controlled token behavior,
- `KWHUVault` for user credit and grant controls,
- `KWHUMarketplace` for listings, escrow, release, fees, and disputes.

## Product Guardrails

The MVP currently assumes all of the following:

- foundation vault grants a one-time signup allocation,
- default signup amount is `100 KWHU`,
- the grant amount is admin-configurable,
- the allocation is non-repayable,
- grant farming risk is accepted for the pilot,
- completed releases deduct a `0.5%` marketplace fee,
- and there is no exit flow in the MVP.

Do not quietly change those rules during implementation. If a change affects token policy, marketplace openness, redemption, transfers, pricing, or grant logic, update the README first.

## Source Hierarchy

When repo materials disagree, use this order:

1. `README.md` for the current agreed MVP scope
2. `PLAN.md` for the detailed implementation plan
3. `AGENTS.md` for contributor and implementation guardrails
4. `Base-app-get-started-guide.md` for technical implementation patterns on Base
5. KWHU Foundation website and PDF materials for broader product context and long-term intent

## Documentation Expectations

If you materially change the MVP shape, update:

- `README.md` for product and architecture decisions
- `PLAN.md` for the detailed implementation plan
- `AGENTS.md` for contributor guardrails

Keep those two files aligned so future contributors do not drift back to the generic Base tutorial or a different KWHU model by accident.
