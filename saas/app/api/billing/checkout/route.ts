import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateCurrentDbUser } from "@/lib/auth";
import { createPayPalSubscription } from "@/lib/paypal";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard/billing", request.url), 303);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  }

  const dbUser = await getOrCreateCurrentDbUser();
  if (!dbUser) {
    return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  }

  const planId = process.env.PAYPAL_PLAN_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  const wantsJson = request.headers.get("accept")?.includes("application/json");

  if (!planId || !appUrl || !clientId || !clientSecret) {
    const errorMessage = "PayPal checkout is not fully configured.";
    if (wantsJson) {
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    return NextResponse.redirect(
      new URL("/dashboard/billing?checkout=error&reason=config", request.url),
      303
    );
  }

  try {
    const subscription = await createPayPalSubscription({
      planId,
      userId: dbUser.id,
      userEmail: dbUser.email,
      returnUrl: `${appUrl}/dashboard/billing?checkout=success`,
      cancelUrl: `${appUrl}/dashboard/billing?checkout=cancelled`
    });

    const existing = await db.subscription.findFirst({
      where: { userId: dbUser.id }
    });

    if (existing) {
      await db.subscription.update({
        where: { id: existing.id },
        data: {
          stripeCustomerId: dbUser.email,
          stripeSubscriptionId: subscription.id,
          status: "INACTIVE"
        }
      });
    } else {
      await db.subscription.create({
        data: {
          userId: dbUser.id,
          stripeCustomerId: dbUser.email,
          stripeSubscriptionId: subscription.id,
          status: "INACTIVE"
        }
      });
    }

    return NextResponse.redirect(subscription.approveUrl, 303);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "PayPal checkout failed.";
    if (wantsJson) {
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    return NextResponse.redirect(
      new URL("/dashboard/billing?checkout=error&reason=paypal", request.url),
      303
    );
  }
}
