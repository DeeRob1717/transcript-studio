import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PricingCards } from "@/components/pricing-cards";

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Transcript Studio",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        name: "Free"
      },
      {
        "@type": "Offer",
        price: "19",
        priceCurrency: "USD",
        name: "Pro"
      }
    ],
    description:
      "Transcript Studio helps users upload audio or video files, generate transcripts, and manage accounts and subscriptions online."
  };

  return (
    <main className="marketing-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />

      <section className="hero">
        <article className="hero-card">
          <p className="eyebrow">Hosted transcription platform</p>
          <h1>Turn audio and video into clean transcripts your customers can trust.</h1>
          <p className="hero-copy">
            Transcript Studio gives creators, researchers, agencies, and media teams a polished
            place to upload files, manage transcripts, and pay for premium usage from one branded
            dashboard.
          </p>
          <div className="hero-actions">
            <Link href="/dashboard" className="primary-button">
              Start free
            </Link>
            <a href="#pricing" className="ghost-button">
              View pricing
            </a>
          </div>
          <div className="hero-proof">
            <span>Built for subscription revenue</span>
            <span>SEO-ready marketing site</span>
            <span>PWA-ready install experience</span>
          </div>
        </article>

        <article className="hero-sidecard">
          <div className="hero-stat">
            <span className="hero-stat-label">Best for</span>
            <strong>Podcasts, interviews, meetings, lectures, and client media</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Monetization</span>
            <strong>Free plan plus recurring Pro billing</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Deployment path</span>
            <strong>Vercel-ready web app with Android wrapper path</strong>
          </div>
        </article>
      </section>

      <section className="section-block" id="features">
        <div className="section-heading">
          <h2>Why this product is launch-ready</h2>
          <p>
            The app already has the business skeleton most founders need first: authentication,
            jobs, usage framing, and premium billing hooks.
          </p>
        </div>
        <section className="feature-grid">
          <article className="feature-card">
            <p className="price-tier">Accounts</p>
            <h3>Users sign up and manage their own workspace</h3>
            <p className="price-copy">
              Clerk powers sign-up and sign-in, while Prisma tracks each user, subscription, and
              transcription job.
            </p>
          </article>
          <article className="feature-card">
            <p className="price-tier">Billing</p>
            <h3>Recurring Pro subscriptions are already wired in</h3>
            <p className="price-copy">
              PayPal checkout and webhook routes are in place so your premium plan can activate
              from a real billing flow.
            </p>
          </article>
          <article className="feature-card">
            <p className="price-tier">Operations</p>
            <h3>Jobs, uploads, and dashboards are organized cleanly</h3>
            <p className="price-copy">
              Users can queue transcription jobs, review statuses, and manage usage from a focused
              dashboard experience.
            </p>
          </article>
        </section>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Simple pricing that is easy to sell</h2>
          <p>
            Start with a generous free tier, then convert serious users to a paid Pro plan with
            higher limits and premium processing.
          </p>
        </div>
        <PricingCards />
      </section>

      <section className="section-block" id="faq">
        <div className="section-heading">
          <h2>Common questions</h2>
          <p>These answers also help search engines understand what the product does.</p>
        </div>
        <section className="faq-grid">
          <article className="faq-card">
            <h3>Can users upload audio and video?</h3>
            <p>Yes. The app is built around media upload workflows and queued transcription jobs.</p>
          </article>
          <article className="faq-card">
            <h3>Can this become a real SaaS business?</h3>
            <p>
              Yes. The project includes authentication, subscriptions, database models, and a
              dashboard structure suitable for a real paid product.
            </p>
          </article>
          <article className="faq-card">
            <h3>Can it become a mobile app too?</h3>
            <p>
              Yes. This release is now being prepared as a PWA first, which is the quickest route
              into Android packaging and Play Store submission.
            </p>
          </article>
        </section>
      </section>

      <section className="section-block cta-strip">
        <div>
          <p className="eyebrow">Ready to launch</p>
          <h2>Publish the website, connect your final domain, and start onboarding users.</h2>
        </div>
        <Link href="/dashboard" className="primary-button">
          Open app
        </Link>
      </section>
    </main>
  );
}
