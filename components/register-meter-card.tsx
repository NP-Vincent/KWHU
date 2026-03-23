'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useAccount,
  useChainId,
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
} from '@/config/contracts'
import { deriveMeterId, signedMeteringRequest } from '@/lib/metering'

export function RegisterMeterCard() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { signMessageAsync } = useSignMessage()
  const { data: hash, isPending: isWriting, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    chainId: deploymentChain.id,
    hash,
  })

  const [meterLabel, setMeterLabel] = useState('')
  const [metadataURI, setMetadataURI] = useState('')
  const [sourceType, setSourceType] = useState('renewable')
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [pendingSyncMeterId, setPendingSyncMeterId] = useState<string | null>(null)

  const derivedMeterId = useMemo(() => deriveMeterId(meterLabel), [meterLabel])

  useEffect(() => {
    if (!isSuccess || !pendingSyncMeterId || !address) {
      return
    }

    let cancelled = false

    async function syncMeter() {
      const walletAddress = address as `0x${string}`

      try {
        setSyncStatus('Syncing meter registration to the metering service...')
        await signedMeteringRequest(
          '/api/meters/sync',
          'meter-sync',
          walletAddress,
          signMessageAsync,
          {
            meterId: pendingSyncMeterId,
            metadataURI,
            sourceType,
          },
        )
        if (!cancelled) {
          setSyncStatus('Meter registration synced for MQTT settlement.')
          setPendingSyncMeterId(null)
        }
      } catch (error) {
        if (!cancelled) {
          setSyncStatus(
            error instanceof Error ? error.message : 'Meter registration sync failed',
          )
        }
      }
    }

    void syncMeter()

    return () => {
      cancelled = true
    }
  }, [address, isSuccess, metadataURI, pendingSyncMeterId, signMessageAsync, sourceType])

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Energy Seller Flow</span>
          <h2>Register a renewable meter onchain.</h2>
        </div>
        <span className={`status-pill ${hasConfiguredEnergyContract ? '' : 'warn'}`}>
          {hasConfiguredEnergyContract ? 'Energy contract ready' : 'Energy contract needed'}
        </span>
      </div>

      <p className="muted-text">
        Meter registration is auto-approved in the MVP. The seller self-declares
        the source as renewable and then uses the derived meter id in MQTT topic
        publishing.
      </p>

      {!hasConfiguredEnergyContract ? (
        <p className="status-note">
          Add the energy settlement contract address before using this flow.
        </p>
      ) : !isConnected ? (
        <p className="status-note">Connect a wallet to register a meter.</p>
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
              <span className="field-label">Meter label</span>
              <input
                placeholder="villa-solar-array-01"
                value={meterLabel}
                onChange={(event) => setMeterLabel(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Source type</span>
              <input
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value.toLowerCase())}
              />
            </label>

            <label className="field field--full">
              <span className="field-label">Metadata URI</span>
              <textarea
                placeholder="ipfs://meter-profile or a future Supabase-backed document"
                value={metadataURI}
                onChange={(event) => setMetadataURI(event.target.value)}
              />
            </label>
          </div>

          <div className="reference-item">
            <strong>Derived meter id</strong>
            <code className="mono-block">{derivedMeterId || 'Enter a meter label first'}</code>
          </div>

          <div className="button-row">
            <button
              className="button-primary"
              disabled={!derivedMeterId || isWriting || isConfirming}
              onClick={() => {
                setPendingSyncMeterId(derivedMeterId)
                setSyncStatus(null)
                writeContract({
                  chainId: deploymentChain.id,
                  address: contractAddresses.energySettlement!,
                  abi: energySettlementAbi,
                  functionName: 'registerMeter',
                  args: [derivedMeterId as `0x${string}`, metadataURI, sourceType],
                })
              }}
            >
              {isWriting
                ? 'Confirm in wallet...'
                : isConfirming
                  ? 'Registering onchain...'
                  : 'Register meter'}
            </button>
          </div>

          {syncStatus ? <p className="status-note">{syncStatus}</p> : null}
        </>
      )}
    </section>
  )
}
