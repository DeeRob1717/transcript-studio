import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="brand-wrap">
        <Link href="/" className="brand">
          Transcript Studio
        </Link>
        <span className="brand-tag">Audio and video transcription for modern teams</span>
      </div>

      <nav className="site-nav">
        <Link href="/#features">Features</Link>
        <Link href="/#pricing">Pricing</Link>
        <Link href="/#faq">FAQ</Link>
        <Link href="/dashboard">Open dashboard</Link>
        <Link href="/sign-in" className="ghost-button">
          Sign in
        </Link>
        <Link href="/sign-up" className="primary-button">
          Get started
        </Link>
      </nav>
    </header>
  );
}
