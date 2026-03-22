export function OrderLifecycle() {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <span className="section-kicker">Order Lifecycle</span>
          <h2>The MVP settlement path stays simple and auditable.</h2>
        </div>
        <span className="status-pill muted">Buyer-confirmed release</span>
      </div>

      <div className="flow-grid">
        <div className="flow-step">
          <span>1. Purchase</span>
          <strong>Buyer funds move into marketplace escrow.</strong>
        </div>
        <div className="flow-step">
          <span>2. Fulfillment</span>
          <strong>Seller marks the order fulfilled onchain.</strong>
        </div>
        <div className="flow-step">
          <span>3. Release</span>
          <strong>Buyer confirms, seller receives payout less the 0.5% fee.</strong>
        </div>
        <div className="flow-step">
          <span>4. Escalation</span>
          <strong>Inactive or contested orders move into dispute review.</strong>
        </div>
      </div>
    </section>
  )
}
