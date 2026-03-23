import { verifyMessage } from 'viem'

import { config, meteringAccount, publicClient, walletClient } from './config.js'
import { energySettlementAbi, tokenAbi, vaultAbi } from './contracts.js'
import { createWalletActionMessage } from './utils.js'

export async function walletIsEligibleForBrokerCredentials(walletAddress: `0x${string}`) {
  const [hasClaimed, balance] = await Promise.all([
    publicClient.readContract({
      address: config.vaultAddress,
      abi: vaultAbi,
      functionName: 'hasClaimed',
      args: [walletAddress],
    }),
    publicClient.readContract({
      address: config.tokenAddress,
      abi: tokenAbi,
      functionName: 'balanceOf',
      args: [walletAddress],
    }),
  ])

  return hasClaimed || balance > 0n
}

export async function verifyWalletAction(
  action: string,
  walletAddress: `0x${string}`,
  issuedAt: string,
  signature: `0x${string}`,
) {
  const message = createWalletActionMessage(action, walletAddress, issuedAt)
  return verifyMessage({
    address: walletAddress,
    message,
    signature,
  })
}

export async function readMeter(meterId: `0x${string}`) {
  return publicClient.readContract({
    address: config.energySettlementAddress,
    abi: energySettlementAbi,
    functionName: 'getMeter',
    args: [meterId],
  })
}

export async function readAgreement(agreementId: bigint) {
  return publicClient.readContract({
    address: config.energySettlementAddress,
    abi: energySettlementAbi,
    functionName: 'getAgreement',
    args: [agreementId],
  })
}

export async function readActiveAgreementId(meterId: `0x${string}`) {
  return publicClient.readContract({
    address: config.energySettlementAddress,
    abi: energySettlementAbi,
    functionName: 'getActiveAgreementId',
    args: [meterId],
  })
}

export async function settleReadingOnchain(args: {
  agreementId: bigint
  readingId: `0x${string}`
  energyWh: bigint
  readingTimestamp: number
  payloadHash: `0x${string}`
}) {
  const request = await publicClient.simulateContract({
    address: config.energySettlementAddress,
    abi: energySettlementAbi,
    functionName: 'settleReading',
    account: meteringAccount,
    args: [
      args.agreementId,
      args.readingId,
      args.energyWh,
      BigInt(args.readingTimestamp),
      args.payloadHash,
    ],
  })

  return walletClient.writeContract(request.request)
}
