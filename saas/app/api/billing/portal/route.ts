import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard/billing", request.url), 303);
}

export async function POST(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "App URL is not configured." }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/dashboard/billing?portal=contact-support", request.url), 303);
}
