'use client'

import { type FormEvent, useEffect, useState } from 'react'
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
import { parseUnits } from 'viem'

import {
  contractAddresses,
  deploymentChain,
  hasConfiguredContracts,
  marketplaceAbi,
} from '@/config/contracts'
import { config } from '@/config/wagmi'

type ListingForm = {
  listingType: '0' | '1'
  pricePerUnit: string
  quantityAvailable: string
  metadataURI: string
}

const initialForm: ListingForm = {
  listingType: '0',
  pricePerUnit: '',
  quantityAvailable: '',
  metadataURI: '',
}

export function CreateListingCard() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ListingForm>(initialForm)
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { data: hash, isPending: isWriting, writeContract, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    chainId: deploymentChain.id,
    hash,
  })

  const nextListingId = useReadContract({
    address: contractAddresses.marketplace,
    abi: marketplaceAbi,
    functionName: 'nextListingId',
    chainId: deploymentChain.id,
    query: {
      enabled: Boolean(contractAddresses.marketplace),
    },
  })

  useEffect(() => {
    if (!isSuccess || !contractAddresses.marketplace) {
      return
    }

    const nextListingKey = readContractQueryOptions(config, {
      address: contractAddresses.marketplace,
      abi: marketplaceAbi,
      functionName: 'nextListingId',
      chainId: deploymentChain.id,
    }).queryKey

    void queryClient.invalidateQueries({ queryKey: nextListingKey })
  }, [isSuccess, queryClient])

  function updateField<K extends keyof ListingForm>(key: K, value: ListingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!contractAddresses.marketplace) {
      return
    }

    writeContract({
      chainId: deploymentChain.id,
      address: contractAddresses.marketplace,
      abi: marketplaceAbi,
      functionName: 'createListing',
      args: [
        Number(form.listingType),
        parseUnits(form.pricePerUnit || '0', 18),
        BigInt(form.quantityAvailable || '0'),
        form.metadataURI,
      ],
    })
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Marketplace</span>
          <h2>Create a KWHU-priced listing.</h2>
        </div>
        <span className="status-pill muted">
          Next listing #{nextListingId.data?.toString() || '0'}
        </span>
      </div>

      <p className="muted-text">
        Sellers remain wallet-native. Listing details stay lean and onchain-ready
        while richer metadata can move offchain later through Supabase-backed
        storage if we decide it helps liquidity.
      </p>

      {!hasConfiguredContracts ? (
        <p className="status-note">
          Add token and marketplace addresses to enable listing creation.
        </p>
      ) : !isConnected ? (
        <p className="status-note">
          Connect a wallet first to create goods or services listings.
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
          <div className="stat-tile">
            <span>Listing access</span>
            <strong className="stat-value">Open</strong>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Listing type</span>
              <select
                value={form.listingType}
                onChange={(event) =>
                  updateField('listingType', event.target.value as ListingForm['listingType'])
                }
              >
                <option value="0">Goods</option>
                <option value="1">Services</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Price per unit (KWHU)</span>
              <input
                inputMode="decimal"
                placeholder="5"
                value={form.pricePerUnit}
                onChange={(event) => updateField('pricePerUnit', event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Quantity available</span>
              <input
                inputMode="numeric"
                placeholder="25"
                value={form.quantityAvailable}
                onChange={(event) => updateField('quantityAvailable', event.target.value)}
              />
            </label>

            <label className="field field--full">
              <span className="field-label">Metadata URI</span>
              <textarea
                placeholder="ipfs://... or a future Supabase-backed listing reference"
                value={form.metadataURI}
                onChange={(event) => updateField('metadataURI', event.target.value)}
              />
            </label>

            <div className="field field--full">
              <div className="button-row">
                <button
                  className="button-primary"
                  disabled={isWriting || isConfirming}
                  type="submit"
                >
                  {isWriting
                    ? 'Confirm in wallet...'
                    : isConfirming
                      ? 'Creating onchain...'
                      : 'Create listing'}
                </button>
                <button
                  className="button-secondary"
                  disabled={isWriting || isConfirming}
                  onClick={() => {
                    reset()
                    setForm(initialForm)
                  }}
                  type="button"
                >
                  Reset form
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </section>
  )
}
