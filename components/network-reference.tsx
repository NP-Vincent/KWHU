export function NetworkReference() {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Development References</span>
          <h2>Base-first reference set for the app build.</h2>
        </div>
        <span className="status-pill muted">Live docs + local docs</span>
      </div>

      <div className="reference-list">
        <div className="reference-item">
          <strong>Base static docs</strong>
          <span className="muted-text">
            Use <code>https://docs.base.org/llms-full.txt</code> as the primary
            live reference while the app is being built.
          </span>
        </div>
        <div className="reference-item">
          <strong>Base app guide in this repo</strong>
          <span className="muted-text">
            The local guide remains the implementation pattern for wallet
            connection, contract reads, writes, and smart-wallet capability
            handling.
          </span>
        </div>
        <div className="reference-item">
          <strong>Supabase compatibility</strong>
          <span className="muted-text">
            The app stays wallet-first. Supabase is reserved for offchain data
            and storage needs rather than core authentication.
          </span>
        </div>
        <div className="reference-item">
          <strong>MQTT + Mosquitto</strong>
          <span className="muted-text">
            Metered renewable settlement uses a dedicated Mosquitto broker and a
            separate Node.js metering service, while the Base app remains the
            wallet and contract interface.
          </span>
        </div>
      </div>
    </section>
  )
}
