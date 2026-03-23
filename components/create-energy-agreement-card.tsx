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
import { formatKwhu, isBytes32Hex } from '@/lib/format'
import { signedMeteringRequest } from '@/lib/metering'

export function CreateEnergyAgreementCard() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { signMessageAsync } = useSignMessage()
  const [meterId, setMeterId] = useState('')
  const [escrowAmount, setEscrowAmount] = useState('10')
  const [endTime, setEndTime] = useState(() => {
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    return new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
      .toISOString()
      .slice(0, 16)
  })
  const [status, setStatus] = useState<string | null>(null)
  const [pendingAgreementId, setPendingAgreementId] = useState<bigint | null>(null)

  const { data: approvalHash, isPending: isApproving, writeContract: approveContract } =
    useWriteContract()
  const { isLoading: isApprovalConfirming, isSuccess: approvalSucceeded } =
    useWaitForTransactionReceipt({
      chainId: deploymentChain.id,
      hash: approvalHash,
    })

  const { data: createHash, isPending: isCreating, writeContract: createAgreement } =
    useWriteContract()
  const { isLoading: isCreateConfirming, isSuccess: createSucceeded } =
    useWaitForTransactionReceipt({
      chainId: deploymentChain.id,
      hash: createHash,
    })

  const desiredEscrow = useMemo(() => {
    try {
      return parseUnits(escrowAmount || '0', 18)
    } catch {
      return 0n
    }
  }, [escrowAmount])

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

  const nextAgreementId = useReadContract({
    address: contractAddresses.energySettlement,
    abi: energySettlementAbi,
    functionName: 'nextAgreementId',
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.energySettlement),
    },
  })

  useEffect(() => {
    if (!createSucceeded || !pendingAgreementId || !address) {
      return
    }

    let cancelled = false

    async function syncAgreement() {
      const walletAddress = address as `0x${string}`
      const agreementId = pendingAgreementId as bigint

      try {
        setStatus('Syncing agreement metadata to the metering service...')
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
          setPendingAgreementId(null)
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
  }, [address, createSucceeded, pendingAgreementId, signMessageAsync])

  const needsApproval = (allowance.data || 0n) < desiredEscrow

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Energy Buyer Flow</span>
          <h2>Open a prepaid escrow agreement for a meter.</h2>
        </div>
        <span className="status-pill muted">
          Next agreement #{(nextAgreementId.data || 0n).toString()}
        </span>
      </div>

      {!hasConfiguredEnergyContract ? (
        <p className="status-note">
          Add the energy settlement contract address before using this flow.
        </p>
      ) : !isConnected ? (
        <p className="status-note">
          Connect a buyer wallet to approve KWHU and create an agreement.
        </p>
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
              <span className="field-label">Meter id (bytes32)</span>
              <input
                placeholder="0x..."
                value={meterId}
                onChange={(event) => setMeterId(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Escrow amount (KWHU)</span>
              <input
                inputMode="decimal"
                value={escrowAmount}
                onChange={(event) => setEscrowAmount(event.target.value)}
              />
            </label>

            <label className="field field--full">
              <span className="field-label">Agreement end time</span>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </label>
          </div>

          <div className="info-grid">
            <div className="stat-tile">
              <span>Requested escrow</span>
              <strong className="stat-value">{formatKwhu(desiredEscrow)}</strong>
            </div>
            <div className="stat-tile">
              <span>Current allowance</span>
              <strong className="stat-value">{formatKwhu(allowance.data || 0n)}</strong>
            </div>
          </div>

          <div className="button-row">
            <button
              className="button-secondary"
              disabled={desiredEscrow === 0n || isApproving || isApprovalConfirming}
              onClick={() => {
                setStatus(null)
                approveContract({
                  chainId: deploymentChain.id,
                  address: contractAddresses.token!,
                  abi: tokenAbi,
                  functionName: 'approve',
                  args: [contractAddresses.energySettlement!, desiredEscrow],
                })
              }}
            >
              {isApproving
                ? 'Approve in wallet...'
                : isApprovalConfirming
                  ? 'Approving...'
                  : 'Approve energy escrow'}
            </button>

            <button
              className="button-primary"
              disabled={
                !isBytes32Hex(meterId) ||
                desiredEscrow === 0n ||
                needsApproval ||
                isCreating ||
                isCreateConfirming
              }
              onClick={() => {
                const previewAgreementId = (nextAgreementId.data || 0n) + 1n
                setPendingAgreementId(previewAgreementId)
                setStatus(null)
                createAgreement({
                  chainId: deploymentChain.id,
                  address: contractAddresses.energySettlement!,
                  abi: energySettlementAbi,
                  functionName: 'createAgreement',
                  args: [
                    meterId as `0x${string}`,
                    desiredEscrow,
                    BigInt(Math.floor(new Date(endTime).getTime() / 1000)),
                  ],
                })
              }}
            >
              {isCreating
                ? 'Confirm in wallet...'
                : isCreateConfirming
                  ? 'Creating agreement...'
                  : 'Create agreement'}
            </button>
          </div>

          {approvalSucceeded && needsApproval === false ? (
            <p className="status-note">Allowance confirmed. You can create the agreement now.</p>
          ) : null}
          {status ? <p className="status-note">{status}</p> : null}
        </>
      )}
    </section>
  )
}
