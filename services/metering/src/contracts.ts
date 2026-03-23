export const vaultAbi = [
  {
    type: 'function',
    name: 'hasClaimed',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export const tokenAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const energySettlementAbi = [
  {
    type: 'function',
    name: 'getMeter',
    stateMutability: 'view',
    inputs: [{ name: 'meterId', type: 'bytes32' }],
    outputs: [
      {
        components: [
          { name: 'owner', type: 'address' },
          { name: 'metadataURI', type: 'string' },
          { name: 'sourceType', type: 'string' },
          { name: 'active', type: 'bool' },
          { name: 'createdAt', type: 'uint64' },
        ],
        name: '',
        type: 'tuple',
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
        name: '',
        type: 'tuple',
      },
    ],
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
    name: 'settleReading',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agreementId', type: 'uint256' },
      { name: 'readingId', type: 'bytes32' },
      { name: 'energyWh', type: 'uint256' },
      { name: 'readingTimestamp', type: 'uint64' },
      { name: 'payloadHash', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const
