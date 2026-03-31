# Transcript Studio SaaS

Transcript Studio is the hosted product version of your transcription app. It includes sign-in,
jobs, billing, dashboards, SEO metadata, and PWA-ready app manifest files so it can be launched as
both a website and the foundation of an Android app.

## Core stack

- Next.js App Router
- Clerk authentication
- Prisma with PostgreSQL
- PayPal subscription billing
- Vercel Blob file uploads
- Optional external Whisper worker integration
- SEO routes for sitemap, robots, metadata, and social previews
- PWA manifest and app icons

## Environment variables

Create `.env.local` and fill in:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
DIRECT_URL=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_PLAN_ID=
PAYPAL_WEBHOOK_ID=
PAYPAL_TEST_EMAIL=buyer@example.com
PAYPAL_TEST_USER_ID=dev-anonymous-user
NEXT_PUBLIC_APP_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=
TRANSCRIPTION_WORKER_URL=
TRANSCRIPTION_WORKER_SECRET=
UPLOADS_BUCKET_URL=
```

## Local development

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Production deployment

The easiest hosting target is Vercel.

1. Push this `saas` folder to GitHub.
2. Import the repository into Vercel.
3. Set the project root to `saas`.
4. Add the same environment variables from `.env.local`.
5. Set `NEXT_PUBLIC_APP_URL` to your real production URL.
6. Redeploy after environment variables are saved.

Recommended domain ideas:

- `transcriptstudio.app`
- `gettranscriptstudio.com`
- `transcriptstudiohq.com`

## Android and Play Store path

This project is now PWA-ready, which is the fastest path toward mobile installation. For a Play
Store release, the next practical step is to wrap the deployed web app with Capacitor or publish it
as a Trusted Web Activity after the public site is live.

## Notes

- Free automatic transcription can be delegated to an external worker such as your existing Whisper server.
- Prisma 7 reads the datasource URL from `prisma.config.ts`.
- Use `DATABASE_URL` for runtime and `DIRECT_URL` for Prisma CLI with Supabase.
- Billing is currently wired for PayPal subscription checkout.
