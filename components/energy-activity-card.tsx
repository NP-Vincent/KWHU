'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

import { fetchWalletActivity, type WalletActivityResponse } from '@/lib/metering'

export function EnergyActivityCard() {
  const { address, isConnected } = useAccount()
  const [data, setData] = useState<WalletActivityResponse | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!address) {
      return
    }

    let cancelled = false

    async function loadActivity() {
      const walletAddress = address as `0x${string}`

      try {
        setIsLoading(true)
        setStatus('Loading meter readings and settlement history...')
        const response = await fetchWalletActivity(walletAddress)
        if (!cancelled) {
          setData(response)
          setStatus(null)
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Failed to load activity')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadActivity()

    return () => {
      cancelled = true
    }
  }, [address])

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Energy Activity</span>
          <h2>Readings and settlements from the off-chain audit store.</h2>
        </div>
        <span className="status-pill muted">Supabase-backed audit trail</span>
      </div>

      {!isConnected ? (
        <p className="status-note">
          Connect a wallet to load its meter registrations, readings, and settlement attempts.
        </p>
      ) : (
        <>
          <div className="button-row">
            <button
              className="button-secondary"
              disabled={isLoading || !address}
              onClick={() => {
                if (!address) {
                  return
                }
                const walletAddress = address as `0x${string}`
                setStatus('Refreshing energy activity...')
                setIsLoading(true)
                void fetchWalletActivity(walletAddress)
                  .then((response) => {
                    setData(response)
                    setStatus(null)
                  })
                  .catch((error) => {
                    setStatus(error instanceof Error ? error.message : 'Failed to refresh')
                  })
                  .finally(() => setIsLoading(false))
              }}
            >
              {isLoading ? 'Refreshing...' : 'Refresh activity'}
            </button>
          </div>

          {status ? <p className="status-note">{status}</p> : null}

          {data ? (
            <div className="activity-grid">
              <div className="reference-item">
                <strong>Registered meters</strong>
                <ul className="data-list">
                  {data.meters.length > 0 ? (
                    data.meters.map((meter, index) => (
                      <li key={`${String(meter.meter_id)}-${index}`} className="data-list-item">
                        <code>{String(meter.meter_id)}</code>
                      </li>
                    ))
                  ) : (
                    <li className="data-list-item">No meters yet</li>
                  )}
                </ul>
              </div>

              <div className="reference-item">
                <strong>Agreement cache</strong>
                <ul className="data-list">
                  {data.agreements.length > 0 ? (
                    data.agreements.map((agreement, index) => (
                      <li
                        key={`${String(agreement.agreement_id)}-${index}`}
                        className="data-list-item"
                      >
                        Agreement #{String(agreement.agreement_id)} with meter{' '}
                        <code>{String(agreement.meter_id)}</code>
                      </li>
                    ))
                  ) : (
                    <li className="data-list-item">No agreement cache rows yet</li>
                  )}
                </ul>
              </div>

              <div className="reference-item">
                <strong>Latest normalized readings</strong>
                <ul className="data-list">
                  {data.readings.length > 0 ? (
                    data.readings.map((reading, index) => (
                      <li
                        key={`${String(reading.reading_id)}-${index}`}
                        className="data-list-item"
                      >
                        <code>{String(reading.reading_id)}</code> • {String(reading.delta_wh || 0)} Wh
                        • {String(reading.accepted ? 'accepted' : reading.rejection_reason || 'rejected')}
                      </li>
                    ))
                  ) : (
                    <li className="data-list-item">No readings captured yet</li>
                  )}
                </ul>
              </div>

              <div className="reference-item">
                <strong>Settlement attempts</strong>
                <ul className="data-list">
                  {data.settlements.length > 0 ? (
                    data.settlements.map((settlement, index) => (
                      <li
                        key={`${String(settlement.id)}-${index}`}
                        className="data-list-item"
                      >
                        {String(settlement.status)} • agreement #{String(settlement.agreement_id || 'n/a')}
                        {settlement.tx_hash ? ` • ${String(settlement.tx_hash)}` : ''}
                      </li>
                    ))
                  ) : (
                    <li className="data-list-item">No settlements yet</li>
                  )}
                </ul>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
