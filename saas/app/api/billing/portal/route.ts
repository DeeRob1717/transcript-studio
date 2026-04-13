import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard/billing", request.url), 303);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  }

  const portalUrl = process.env.PAYPAL_CUSTOMER_PORTAL_URL;
  if (portalUrl) {
    return NextResponse.redirect(portalUrl, 303);
  }

  return NextResponse.redirect(new URL("/dashboard/billing?portal=contact-support", request.url), 303);
}
