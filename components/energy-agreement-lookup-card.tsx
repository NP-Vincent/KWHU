'use client'

import { useEffect, useMemo, useState } from 'react'
import { parseUnits } from 'viem'
import {
  useAccount,
  useChainId,
  useReadContract,
  useSignMessage,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'

import {
  contractAddresses,
  deploymentChain,
  energySettlementAbi,
  hasConfiguredEnergyContract,
  tokenAbi,
} from '@/config/contracts'
import { formatDateTime, formatKwhu, formatWh, isBytes32Hex, shortenAddress } from '@/lib/format'
import { signedMeteringRequest } from '@/lib/metering'

export function EnergyAgreementLookupCard() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { signMessageAsync } = useSignMessage()
  const [meterId, setMeterId] = useState('')
  const [agreementIdInput, setAgreementIdInput] = useState('')
  const [topUpAmount, setTopUpAmount] = useState('5')
  const [status, setStatus] = useState<string | null>(null)

  const { data: topUpApprovalHash, isPending: isTopUpApproving, writeContract: approveTopUp } =
    useWriteContract()
  const { isLoading: isTopUpApprovalConfirming } = useWaitForTransactionReceipt({
    chainId: deploymentChain.id,
    hash: topUpApprovalHash,
  })

  const { data: topUpHash, isPending: isToppingUp, writeContract: topUpAgreement } =
    useWriteContract()
  const { isLoading: isTopUpConfirming, isSuccess: topUpSucceeded } =
    useWaitForTransactionReceipt({
      chainId: deploymentChain.id,
      hash: topUpHash,
    })

  const { data: closeHash, isPending: isClosing, writeContract: closeAgreement } =
    useWriteContract()
  const { isLoading: isCloseConfirming, isSuccess: closeSucceeded } =
    useWaitForTransactionReceipt({
      chainId: deploymentChain.id,
      hash: closeHash,
    })

  const activeAgreementId = useReadContract({
    address: contractAddresses.energySettlement,
    abi: energySettlementAbi,
    functionName: 'getActiveAgreementId',
    args: isBytes32Hex(meterId) ? [meterId as `0x${string}`] : undefined,
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.energySettlement && isBytes32Hex(meterId)),
    },
  })

  const effectiveAgreementId = useMemo(() => {
    if (agreementIdInput.trim()) {
      try {
        return BigInt(agreementIdInput)
      } catch {
        return null
      }
    }

    if (activeAgreementId.data && activeAgreementId.data > 0n) {
      return activeAgreementId.data
    }

    return null
  }, [activeAgreementId.data, agreementIdInput])

  const agreement = useReadContract({
    address: contractAddresses.energySettlement,
    abi: energySettlementAbi,
    functionName: 'getAgreement',
    args: effectiveAgreementId !== null ? [effectiveAgreementId] : undefined,
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.energySettlement && effectiveAgreementId !== null),
    },
  })

  const desiredTopUp = useMemo(() => {
    try {
      return parseUnits(topUpAmount || '0', 18)
    } catch {
      return 0n
    }
  }, [topUpAmount])

  const allowance = useReadContract({
    address: contractAddresses.token,
    abi: tokenAbi,
    functionName: 'allowance',
    args:
      address && contractAddresses.energySettlement
        ? [address, contractAddresses.energySettlement]
        : undefined,
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(address && contractAddresses.token && contractAddresses.energySettlement),
    },
  })

  useEffect(() => {
    if ((!topUpSucceeded && !closeSucceeded) || !address || effectiveAgreementId === null) {
      return
    }

    let cancelled = false

    async function syncAgreement() {
      const walletAddress = address as `0x${string}`
      const agreementId = effectiveAgreementId as bigint

      try {
        setStatus('Refreshing offchain agreement cache...')
        await signedMeteringRequest(
          '/api/agreements/sync',
          'agreement-sync',
          walletAddress,
          signMessageAsync,
          {
            agreementId: agreementId.toString(),
          },
        )
        if (!cancelled) {
          setStatus(`Agreement #${agreementId.toString()} synced.`)
          void activeAgreementId.refetch()
          void agreement.refetch()
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Agreement sync failed')
        }
      }
    }

    void syncAgreement()

    return () => {
      cancelled = true
    }
  }, [
    activeAgreementId,
    address,
    agreement,
    closeSucceeded,
    effectiveAgreementId,
    signMessageAsync,
    topUpSucceeded,
  ])

  const buyerMatches =
    address && agreement.data ? agreement.data.buyer.toLowerCase() === address.toLowerCase() : false

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Agreement Status</span>
          <h2>Inspect, top up, or close an energy agreement.</h2>
        </div>
        <span className="status-pill muted">Onchain agreement state</span>
      </div>

      {!hasConfiguredEnergyContract ? (
        <p className="status-note">Add the energy settlement contract address first.</p>
      ) : !isConnected ? (
        <p className="status-note">Connect a wallet to inspect agreement state.</p>
      ) : chainId !== deploymentChain.id ? (
        <div className="button-row">
          <button
            className="button-primary"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: deploymentChain.id })}
          >
            {isSwitching ? 'Switching...' : 'Switch to Base Mainnet'}
          </button>
        </div>
      ) : (
        <>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Meter id lookup</span>
              <input
                placeholder="0x..."
                value={meterId}
                onChange={(event) => setMeterId(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Agreement id override</span>
              <input
                placeholder="1"
                value={agreementIdInput}
                onChange={(event) => setAgreementIdInput(event.target.value)}
              />
            </label>
          </div>

          <p className="status-note">
            Active agreement by meter: {activeAgreementId.data?.toString() || 'none'}
          </p>

          {agreement.data ? (
            <>
              <div className="reference-list">
                <div className="reference-item">
                  <strong>Buyer</strong>
                  <code className="mono-block">{shortenAddress(agreement.data.buyer)}</code>
                </div>
                <div className="reference-item">
                  <strong>Seller</strong>
                  <code className="mono-block">{shortenAddress(agreement.data.seller)}</code>
                </div>
                <div className="reference-item">
                  <strong>Remaining escrow</strong>
                  <code className="mono-block">{formatKwhu(agreement.data.remainingEscrow)}</code>
                </div>
                <div className="reference-item">
                  <strong>Settled energy</strong>
                  <code className="mono-block">{formatWh(agreement.data.settledEnergyWh)}</code>
                </div>
                <div className="reference-item">
                  <strong>Ends</strong>
                  <code className="mono-block">{formatDateTime(agreement.data.endTime)}</code>
                </div>
                <div className="reference-item">
                  <strong>Status</strong>
                  <code className="mono-block">
                    {agreement.data.active ? 'Active' : 'Closed'}
                  </code>
                </div>
              </div>

              {buyerMatches ? (
                <>
                  <div className="form-grid">
                    <label className="field">
                      <span className="field-label">Top-up amount (KWHU)</span>
                      <input
                        inputMode="decimal"
                        value={topUpAmount}
                        onChange={(event) => setTopUpAmount(event.target.value)}
                      />
                    </label>

                    <div className="field">
                      <span className="field-label">Allowance available</span>
                      <div className="reference-item">
                        <strong>{formatKwhu(allowance.data || 0n)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="button-row">
                    <button
                      className="button-secondary"
                      disabled={desiredTopUp === 0n || isTopUpApproving || isTopUpApprovalConfirming}
                      onClick={() =>
                        approveTopUp({
                          chainId: deploymentChain.id,
                          address: contractAddresses.token!,
                          abi: tokenAbi,
                          functionName: 'approve',
                          args: [contractAddresses.energySettlement!, desiredTopUp],
                        })
                      }
                    >
                      {isTopUpApproving
                        ? 'Approve in wallet...'
                        : isTopUpApprovalConfirming
                          ? 'Approving...'
                          : 'Approve top-up'}
                    </button>

                    <button
                      className="button-primary"
                      disabled={
                        effectiveAgreementId === null ||
                        desiredTopUp === 0n ||
                        (allowance.data || 0n) < desiredTopUp ||
                        isToppingUp ||
                        isTopUpConfirming
                      }
                      onClick={() =>
                        topUpAgreement({
                          chainId: deploymentChain.id,
                          address: contractAddresses.energySettlement!,
                          abi: energySettlementAbi,
                          functionName: 'topUpAgreement',
                          args: [effectiveAgreementId!, desiredTopUp],
                        })
                      }
                    >
                      {isToppingUp
                        ? 'Confirm in wallet...'
                        : isTopUpConfirming
                          ? 'Topping up...'
                          : 'Top up agreement'}
                    </button>

                    <button
                      className="button-secondary"
                      disabled={effectiveAgreementId === null || isClosing || isCloseConfirming}
                      onClick={() =>
                        closeAgreement({
                          chainId: deploymentChain.id,
                          address: contractAddresses.energySettlement!,
                          abi: energySettlementAbi,
                          functionName: 'closeAgreement',
                          args: [effectiveAgreementId!],
                        })
                      }
                    >
                      {isClosing
                        ? 'Confirm in wallet...'
                        : isCloseConfirming
                          ? 'Closing...'
                          : 'Close agreement'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="status-note">
                  Top-up and close actions are available only to the buyer wallet.
                </p>
              )}
            </>
          ) : (
            <p className="status-note">
              Enter a meter id or agreement id to inspect energy settlement state.
            </p>
          )}

          {status ? <p className="status-note">{status}</p> : null}
        </>
      )}
    </section>
  )
}
