import { DashboardShell } from "@/components/dashboard-shell";

export default async function BillingPage() {
  const currentPlan = "Free";

  return (
    <main className="dashboard-page">
      <DashboardShell
        title="Billing"
        description="Upgrade users to Pro, review subscription actions, and move back into the app anytime."
      >
        <section className="dashboard-grid">
          <article className="price-card">
            <p className="price-tier">Current plan</p>
            <h2>{currentPlan}</h2>
            <p className="price-copy">
              Connect PayPal subscriptions so users can upgrade to a recurring Pro plan.
            </p>
            <form action="/api/billing/checkout" method="post">
              <button className="primary-button" type="submit">
                Upgrade to Pro
              </button>
            </form>
          </article>

          <article className="price-card">
            <p className="price-tier">Manage plan</p>
            <h2>Customer billing</h2>
            <p className="price-copy">
              PayPal handles subscription checkout and customer billing outside the app.
            </p>
            <form action="/api/billing/portal" method="post">
              <button className="ghost-button" type="submit">
                Billing help
              </button>
            </form>
          </article>
        </section>
      </DashboardShell>
    </main>
  );
}
