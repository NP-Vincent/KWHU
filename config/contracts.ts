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
} as const

export const hasConfiguredContracts = Boolean(
  contractAddresses.token &&
    contractAddresses.vault &&
    contractAddresses.marketplace,
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
