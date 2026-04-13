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
  const appUserId = resource?.custom_id ? String(resource.custom_id) : null;
  const subscriptionId = resource?.id ? String(resource.id) : null;
  const subscriberEmail = resource?.subscriber?.email_address ?? null;

  const subscriptionById = subscriptionId
    ? await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId }
      })
    : null;

  const effectiveUserId = appUserId || subscriptionById?.userId || null;

  if (!effectiveUserId) {
    return NextResponse.json({ received: true, skipped: true });
  }

  if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || eventType === "PAYMENT.SALE.COMPLETED") {
    const existing =
      subscriptionById ||
      (await db.subscription.findFirst({
        where: { userId: effectiveUserId }
      }));

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
          userId: effectiveUserId,
          stripeCustomerId: subscriberEmail,
          stripeSubscriptionId: subscriptionId,
          status: "ACTIVE"
        }
      });
    }

    await db.user.update({
      where: { id: effectiveUserId },
      data: { plan: "PRO" }
    });
  }

  if (
    eventType === "BILLING.SUBSCRIPTION.CANCELLED" ||
    eventType === "BILLING.SUBSCRIPTION.SUSPENDED" ||
    eventType === "BILLING.SUBSCRIPTION.EXPIRED"
  ) {
    const existing =
      subscriptionById ||
      (await db.subscription.findFirst({
        where: { userId: effectiveUserId }
      }));

    if (existing) {
      await db.subscription.update({
        where: { id: existing.id },
        data: { status: "CANCELED" }
      });
    }

    await db.user.update({
      where: { id: effectiveUserId },
      data: { plan: "FREE" }
    });
  }

  return NextResponse.json({ received: true });
}
