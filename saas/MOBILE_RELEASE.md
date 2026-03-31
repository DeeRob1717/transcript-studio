# Mobile Release Path

## Current status

The web app is now:

- live on Vercel
- SEO-ready
- PWA-ready through `manifest.webmanifest`

That means Android users can already open the live site and install it from the browser when the
browser offers "Add to Home Screen".

## Fastest Play Store route

The fastest practical Play Store route is:

1. Keep the live website as the product backend.
2. Wrap the deployed site as an Android shell.
3. Publish that Android build through Google Play Console.

## What is still required for Play Store publishing

- A Google Play Console developer account
- Android Studio installed on the build machine
- A signed Android app package (`.aab`)
- Store listing assets such as screenshots, icon, and privacy policy URL

## Recommended next implementation step

After the production domain is finalized, create the Android wrapper with either:

- Capacitor, if you want a WebView-based Android app
- Trusted Web Activity, if you want a browser-backed Android app for the live site

## Suggested production domain

- `https://transcriptstudiohq.vercel.app`

Use that as the temporary live web address until a custom domain is attached.
