import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="marketing-shell" style={{ padding: "48px 0" }}>
      <SignUp fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard" />
    </main>
  );
}
