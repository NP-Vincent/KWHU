'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

import { signedMeteringRequest } from '@/lib/metering'

type BrokerCredentialResponse = {
  wallet_address: string
  mqtt_username: string
  mqtt_password: string
  allowed_topic: string
  broker_url: string
  active: boolean
}

export function BrokerCredentialsCard() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [credentials, setCredentials] = useState<BrokerCredentialResponse | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function requestCredentials() {
    if (!address) {
      return
    }

    const walletAddress = address as `0x${string}`

    try {
      setIsLoading(true)
      setStatus('Requesting wallet-linked MQTT credentials...')
      const response = await signedMeteringRequest<BrokerCredentialResponse>(
        '/api/broker-credentials',
        'broker-credentials',
        walletAddress,
        signMessageAsync,
      )
      setCredentials(response)
      setStatus('Broker credentials ready.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Credential request failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Broker Access</span>
          <h2>Issue wallet-linked Mosquitto credentials.</h2>
        </div>
        <span className="status-pill muted">TLS + ACL scoped</span>
      </div>

      {!isConnected ? (
        <p className="status-note">
          Connect a wallet that has already received KWHU credit to request
          broker credentials.
        </p>
      ) : (
        <>
          <p className="muted-text">
            The metering service verifies a wallet signature, checks KWHU credit
            eligibility, and then provisions a publisher identity scoped to this
            wallet’s topic hierarchy.
          </p>
          <div className="button-row">
            <button
              className="button-primary"
              disabled={isLoading}
              onClick={() => void requestCredentials()}
            >
              {isLoading ? 'Authorizing...' : 'Request broker credentials'}
            </button>
          </div>

          {status ? <p className="status-note">{status}</p> : null}

          {credentials ? (
            <div className="reference-list">
              <div className="reference-item">
                <strong>Broker URL</strong>
                <code className="mono-block">{credentials.broker_url}</code>
              </div>
              <div className="reference-item">
                <strong>MQTT username</strong>
                <code className="mono-block">{credentials.mqtt_username}</code>
              </div>
              <div className="reference-item">
                <strong>MQTT password</strong>
                <code className="mono-block">{credentials.mqtt_password}</code>
              </div>
              <div className="reference-item">
                <strong>Allowed topic pattern</strong>
                <code className="mono-block">{credentials.allowed_topic}</code>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
