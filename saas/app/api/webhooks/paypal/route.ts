import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPayPalWebhook } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);

  let isValid = false;

  try {
    isValid = await verifyPayPalWebhook({
      headers: request.headers,
      webhookEvent: payload
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook verification failed." },
      { status: 400 }
    );
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid PayPal webhook signature." }, { status: 400 });
  }

  const eventType = payload?.event_type;
  const resource = payload?.resource ?? {};
  const appUserId = resource?.custom_id;
  const subscriptionId = resource?.id ? String(resource.id) : null;
  const subscriberEmail = resource?.subscriber?.email_address ?? null;

  if (!appUserId) {
    return NextResponse.json({ received: true, skipped: true });
  }

  if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || eventType === "PAYMENT.SALE.COMPLETED") {
    const existing = await db.subscription.findFirst({
      where: {
        OR: [{ stripeSubscriptionId: subscriptionId ?? undefined }, { userId: appUserId }]
      }
    });

    if (existing) {
      await db.subscription.update({
        where: { id: existing.id },
        data: {
          stripeCustomerId: subscriberEmail,
          stripeSubscriptionId: subscriptionId,
          status: "ACTIVE"
        }
      });
    } else {
      await db.subscription.create({
        data: {
          userId: appUserId,
          stripeCustomerId: subscriberEmail,
          stripeSubscriptionId: subscriptionId,
          status: "ACTIVE"
        }
      });
    }

    await db.user.update({
      where: { id: appUserId },
      data: { plan: "PRO" }
    });
  }

  if (
    eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
    eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    eventType === "BILLING.SUBSCRIPTION.EXPIRED"
  ) {
    const existing = await db.subscription.findFirst({
      where: {
        OR: [{ stripeSubscriptionId: subscriptionId ?? undefined }, { userId: appUserId }]
      }
    });

    if (existing) {
      await db.subscription.update({
        where: { id: existing.id },
        data: { status: "CANCELED" }
      });
    }

    await db.user.update({
      where: { id: appUserId },
      data: { plan: "FREE" }
    });
  }

  return NextResponse.json({ received: true });
}
