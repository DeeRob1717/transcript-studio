export function PricingCards() {
  return (
    <section className="pricing-grid" id="pricing">
      <article className="price-card">
        <p className="price-tier">Free</p>
        <h3>Launch gently</h3>
        <p className="price-copy">
          Perfect for first-time users, demos, and light weekly transcription work.
        </p>
        <strong className="price-amount">$0</strong>
        <ul>
          <li>10 uploads per month</li>
          <li>50 MB max upload size</li>
          <li>Standard queue priority</li>
          <li>Email-based sign in and dashboard access</li>
        </ul>
      </article>

      <article className="price-card price-card-featured">
        <p className="price-tier">Pro</p>
        <h3>Run it professionally</h3>
        <p className="price-copy">
          Built for creators, agencies, researchers, and media teams running transcription at scale.
        </p>
        <strong className="price-amount">$19/mo</strong>
        <ul>
          <li>500 uploads per month</li>
          <li>500 MB max upload size</li>
          <li>Priority processing</li>
          <li>Subscription billing and premium access</li>
        </ul>
      </article>
    </section>
  );
}
