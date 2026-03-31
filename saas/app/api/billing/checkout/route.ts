import { NextRequest, NextResponse } from "next/server";
import { createPayPalSubscription } from "@/lib/paypal";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard/billing", request.url), 303);
}

export async function POST(request: NextRequest) {
  const effectiveUserId = process.env.PAYPAL_TEST_USER_ID || "dev-anonymous-user";
  const effectiveEmail = process.env.PAYPAL_TEST_EMAIL || "buyer@example.com";

  const planId = process.env.PAYPAL_PLAN_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!planId || !appUrl) {
    return NextResponse.json(
      { error: "PayPal checkout is not fully configured." },
      { status: 500 }
    );
  }

  try {
    const subscription = await createPayPalSubscription({
      planId,
      userId: effectiveUserId,
      userEmail: effectiveEmail,
      returnUrl: `${appUrl}/dashboard/billing?checkout=success`,
      cancelUrl: `${appUrl}/dashboard/billing?checkout=cancelled`
    });

    return NextResponse.redirect(subscription.approveUrl, 303);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PayPal checkout failed." },
      { status: 500 }
    );
  }
}
