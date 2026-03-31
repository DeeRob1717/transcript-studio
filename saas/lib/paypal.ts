const PAYPAL_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured.");
  }

  return { clientId, clientSecret };
}

export async function getPayPalAccessToken() {
  const { clientId, clientSecret } = getPayPalCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal token request failed: ${errorText}`);
  }

  const payload = await response.json();
  return payload.access_token as string;
}

export async function createPayPalSubscription(params: {
  planId: string;
  userId: string;
  userEmail: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      plan_id: params.planId,
      custom_id: params.userId,
      subscriber: {
        email_address: params.userEmail
      },
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal subscription creation failed: ${errorText}`);
  }

  const payload = await response.json();
  const approveUrl = payload?.links?.find((link: { rel?: string; href?: string }) => link.rel === "approve")?.href;

  if (!approveUrl) {
    throw new Error("PayPal did not return an approval link.");
  }

  return {
    id: payload.id as string,
    approveUrl: approveUrl as string
  };
}

export async function verifyPayPalWebhook({
  headers,
  webhookEvent
}: {
  headers: Headers;
  webhookEvent: unknown;
}) {
  const accessToken = await getPayPalAccessToken();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is not configured.");
  }

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: webhookEvent
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal webhook verification failed: ${errorText}`);
  }

  const payload = await response.json();
  return payload.verification_status === "SUCCESS";
}
