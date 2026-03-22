'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { readContractQueryOptions } from 'wagmi/query'
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'

import { config } from '@/config/wagmi'
import {
  contractAddresses,
  deploymentChain,
  hasConfiguredContracts,
  tokenAbi,
  vaultAbi,
} from '@/config/contracts'
import { formatKwhu } from '@/lib/format'

export function ClaimVaultCard() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const queryClient = useQueryClient()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { data: hash, isPending: isWriting, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    chainId: deploymentChain.id,
    hash,
  })

  const grantAmount = useReadContract({
    address: contractAddresses.vault,
    abi: vaultAbi,
    functionName: 'signupGrantAmount',
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.vault),
    },
  })

  const hasClaimed = useReadContract({
    address: contractAddresses.vault,
    abi: vaultAbi,
    functionName: 'hasClaimed',
    args: address ? [address] : undefined,
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.vault && address),
    },
  })

  const balance = useReadContract({
    address: contractAddresses.token,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.token && address),
    },
  })

  useEffect(() => {
    if (!isSuccess || !address || !contractAddresses.vault || !contractAddresses.token) {
      return
    }

    const claimedQueryKey = readContractQueryOptions(config, {
      address: contractAddresses.vault,
      abi: vaultAbi,
      functionName: 'hasClaimed',
      args: [address],
      chainId: deploymentChain.id,
    }).queryKey

    const balanceQueryKey = readContractQueryOptions(config, {
      address: contractAddresses.token,
      abi: tokenAbi,
      functionName: 'balanceOf',
      args: [address],
      chainId: deploymentChain.id,
    }).queryKey

    void queryClient.invalidateQueries({ queryKey: claimedQueryKey })
    void queryClient.invalidateQueries({ queryKey: balanceQueryKey })
  }, [address, isSuccess, queryClient])

  const canClaim =
    isConnected &&
    hasConfiguredContracts &&
    chainId === deploymentChain.id &&
    hasClaimed.data === false

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Foundation Vault</span>
          <h2>Claim the onboarding grant from the vault.</h2>
        </div>
        <span className={`status-pill ${hasConfiguredContracts ? '' : 'warn'}`}>
          {hasConfiguredContracts ? 'Contracts configured' : 'Contract addresses needed'}
        </span>
      </div>

      <div className="info-grid">
        <div className="stat-tile">
          <span>Signup grant</span>
          <strong className="stat-value">
            {grantAmount.data !== undefined ? formatKwhu(grantAmount.data) : '...'}
          </strong>
        </div>
        <div className="stat-tile">
          <span>Your balance</span>
          <strong className="stat-value">
            {balance.data !== undefined ? formatKwhu(balance.data) : '--'}
          </strong>
        </div>
      </div>

      {!hasConfiguredContracts ? (
        <p className="status-note">
          Add the deployed contract addresses to <code>.env</code> before live
          reads and writes can start.
        </p>
      ) : !isConnected ? (
        <p className="status-note">
          Connect a wallet to check claim eligibility and balance.
        </p>
      ) : chainId !== deploymentChain.id ? (
        <>
          <p className="status-note">
            Your wallet is on the wrong network for KWHU. Switch to Base Mainnet
            before claiming.
          </p>
          <div className="button-row">
            <button
              className="button-primary"
              disabled={isSwitching}
              onClick={() => switchChain({ chainId: deploymentChain.id })}
            >
              {isSwitching ? 'Switching...' : 'Switch to Base Mainnet'}
            </button>
          </div>
        </>
      ) : hasClaimed.data ? (
        <p className="status-note">
          This wallet has already claimed the signup allocation. Marketplace
          actions are the next step from here.
        </p>
      ) : (
        <>
          <p className="status-note">
            The grant is non-repayable in the MVP and is intended to bootstrap
            KWHU circulation inside the marketplace.
          </p>
          <div className="button-row">
            <button
              className="button-primary"
              disabled={!canClaim || isWriting || isConfirming}
              onClick={() =>
                writeContract({
                  chainId: deploymentChain.id,
                  address: contractAddresses.vault!,
                  abi: vaultAbi,
                  functionName: 'claimSignupGrant',
                })
              }
            >
              {isWriting
                ? 'Confirm in wallet...'
                : isConfirming
                  ? 'Claiming onchain...'
                  : 'Claim vault grant'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
