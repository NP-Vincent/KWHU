import { base } from 'wagmi/chains'
import { isAddress } from 'viem'

export const deploymentChain = base
export const defaultBaseRpcUrl = 'https://mainnet.base.org'

function readAddress(value: string | undefined) {
  return value && isAddress(value) ? value : undefined
}

export const contractAddresses = {
  token: readAddress(process.env.NEXT_PUBLIC_KWHU_TOKEN_ADDRESS),
  vault: readAddress(process.env.NEXT_PUBLIC_KWHU_VAULT_ADDRESS),
  marketplace: readAddress(process.env.NEXT_PUBLIC_KWHU_MARKETPLACE_ADDRESS),
  energySettlement: readAddress(process.env.NEXT_PUBLIC_KWHU_ENERGY_SETTLEMENT_ADDRESS),
} as const

export const hasConfiguredContracts = Boolean(
  contractAddresses.token &&
    contractAddresses.vault &&
    contractAddresses.marketplace,
)

export const hasConfiguredEnergyContract = Boolean(
  contractAddresses.token && contractAddresses.energySettlement,
)

export const tokenAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const vaultAbi = [
  {
    type: 'function',
    name: 'signupGrantAmount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'hasClaimed',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'claimSignupGrant',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const

export const marketplaceAbi = [
  {
    type: 'function',
    name: 'nextListingId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'nextOrderId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'fulfillmentTimeout',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'createListing',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'listingType', type: 'uint8' },
      { name: 'pricePerUnit', type: 'uint256' },
      { name: 'quantityAvailable', type: 'uint256' },
      { name: 'metadataURI', type: 'string' },
    ],
    outputs: [{ name: 'listingId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'purchase',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'listingId', type: 'uint256' },
      { name: 'quantity', type: 'uint256' },
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }],
  },
] as const

export const energySettlementAbi = [
  {
    type: 'function',
    name: 'nextAgreementId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getActiveAgreementId',
    stateMutability: 'view',
    inputs: [{ name: 'meterId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getMeter',
    stateMutability: 'view',
    inputs: [{ name: 'meterId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'metadataURI', type: 'string' },
          { name: 'sourceType', type: 'string' },
          { name: 'active', type: 'bool' },
          { name: 'createdAt', type: 'uint64' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getAgreement',
    stateMutability: 'view',
    inputs: [{ name: 'agreementId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'meterId', type: 'bytes32' },
          { name: 'buyer', type: 'address' },
          { name: 'seller', type: 'address' },
          { name: 'totalEscrow', type: 'uint256' },
          { name: 'remainingEscrow', type: 'uint256' },
          { name: 'settledEnergyWh', type: 'uint256' },
          { name: 'settledAmount', type: 'uint256' },
          { name: 'endTime', type: 'uint64' },
          { name: 'createdAt', type: 'uint64' },
          { name: 'lastSettledAt', type: 'uint64' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'registerMeter',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'meterId', type: 'bytes32' },
      { name: 'metadataURI', type: 'string' },
      { name: 'sourceType', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'createAgreement',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'meterId', type: 'bytes32' },
      { name: 'escrowAmount', type: 'uint256' },
      { name: 'endTime', type: 'uint64' },
    ],
    outputs: [{ name: 'agreementId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'topUpAgreement',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agreementId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'closeAgreement',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agreementId', type: 'uint256' }],
    outputs: [],
  },
] as const
