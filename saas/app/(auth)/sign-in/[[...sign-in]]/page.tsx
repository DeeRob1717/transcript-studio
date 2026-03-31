import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="marketing-shell" style={{ padding: "48px 0" }}>
      <SignIn fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard" />
    </main>
  );
}
