import { DashboardShell } from "@/components/dashboard-shell";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateCurrentDbUser } from "@/lib/auth";
import { formatPlanName } from "@/lib/plans";

function getCheckoutStatusMessage(status?: string, reason?: string) {
  if (status === "success") return "Subscription approved. Your plan will update after PayPal webhook confirmation.";
  if (status === "cancelled") return "Checkout was cancelled.";
  if (status === "error" && reason === "config") return "Billing is not configured in server environment variables.";
  if (status === "error") return "Checkout failed. Please try again.";
  return "";
}

export default async function BillingPage({
  searchParams
}: {
  searchParams:
    | { checkout?: string; reason?: string; portal?: string }
    | Promise<{ checkout?: string; reason?: string; portal?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const dbUser = await getOrCreateCurrentDbUser();
  if (!dbUser) {
    redirect("/sign-in");
  }

  const params = await Promise.resolve(searchParams);
  const checkoutMessage = getCheckoutStatusMessage(params.checkout, params.reason);
  const portalMessage =
    params.portal === "contact-support"
      ? "Customer self-service portal is not configured yet. Please contact support for billing changes."
      : "";
  const currentPlan = formatPlanName(dbUser.plan);

  return (
    <main className="dashboard-page">
      <DashboardShell
        title="Billing"
        description="Upgrade users to Pro, review subscription actions, and move back into the app anytime."
      >
        {checkoutMessage ? <p className="helper-text">{checkoutMessage}</p> : null}
        {portalMessage ? <p className="helper-text">{portalMessage}</p> : null}

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
