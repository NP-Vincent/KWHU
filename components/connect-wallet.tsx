'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'

import { shortenAddress } from '@/lib/format'

export function ConnectWallet() {
  const { address, chain, isConnected, isConnecting, isReconnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <aside className="card wallet-panel">
      <div className="card-header">
        <div>
          <span className="section-kicker">Wallet</span>
          <h2>Connect with Base best-practice wallet flows.</h2>
        </div>
        <span className={`status-pill ${isConnected ? '' : 'muted'}`}>
          {isReconnecting
            ? 'Reconnecting'
            : isConnecting
              ? 'Connecting'
              : isConnected
                ? 'Connected'
                : 'Disconnected'}
        </span>
      </div>

      {isConnected && address ? (
        <>
          <div className="address-chip">
            <span>{shortenAddress(address)}</span>
            <span>{chain?.name || 'Unknown network'}</span>
          </div>
          <p className="muted-text">
            The app supports both injected wallets and Base Account so we can
            optimize for familiar EOAs and smart-wallet onboarding.
          </p>
          <div className="button-row">
            <button className="button-secondary" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted-text">
            Start with a wallet connection, then claim the vault grant and move
            into marketplace actions.
          </p>
          <div className="button-row">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                className="button-primary"
                disabled={isConnecting}
                onClick={() => connect({ connector })}
              >
                {isConnecting ? 'Waiting...' : `Connect ${connector.name}`}
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  )
}
