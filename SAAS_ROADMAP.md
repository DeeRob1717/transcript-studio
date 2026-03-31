# Transcript Studio SaaS Roadmap

## Goal

Turn the current local transcription tool into a hosted product where users can:

- sign up
- log in
- upload media
- receive transcripts
- manage transcript history
- pay for premium usage

## Current State

The current app is a strong local prototype:

- single PowerShell server
- local file storage
- local Whisper transcription
- no accounts
- no billing
- no user isolation
- no queueing
- no cloud deployment model

This is good for personal use, but not yet suitable for public multi-user hosting.

## Recommended Product Direction

### Offer two modes

1. Hosted SaaS
   Users sign up on your website and use your cloud transcription platform.

2. Self-hosted desktop/local version
   Keep the current PowerShell version as a lightweight offline edition.

This lets you monetize the hosted version while preserving the free local tool.

## Recommended Production Stack

### Web app

- Next.js
- TypeScript
- Tailwind CSS or plain CSS modules

### Backend

- Next.js API routes or NestJS
- background worker for transcription jobs

### Database

- PostgreSQL

### Auth

- Clerk or Auth.js

### Billing

- Stripe subscriptions

### Storage

- S3-compatible object storage
  - AWS S3
  - Cloudflare R2
  - Supabase Storage

### Queue

- Redis + BullMQ

### Deployment

- Vercel for frontend
- Railway / Render / Fly.io / VPS for worker and API
- PostgreSQL managed database

### Transcription engine

Choose one:

1. Hosted API transcription
   Easier to scale, faster to launch, usage-based cost.

2. Self-hosted Whisper worker
   More control, but requires stronger servers and queue management.

## MVP Features For First Sellable Version

### Public website

- landing page
- pricing page
- sign up
- sign in

### User dashboard

- upload file
- view job status
- read transcript
- download transcript
- delete transcript

### Subscription system

- free plan
- premium plan
- upgrade / downgrade
- usage limits

### Admin basics

- monitor jobs
- monitor failed uploads
- manage users

## Data Model

### users

- id
- email
- name
- auth_provider_id
- plan
- created_at

### subscriptions

- id
- user_id
- stripe_customer_id
- stripe_subscription_id
- status
- current_period_end

### transcription_jobs

- id
- user_id
- original_filename
- media_url
- transcript_text
- transcript_format
- status
- duration_seconds
- error_message
- created_at
- completed_at

### usage_events

- id
- user_id
- job_id
- metric_type
- metric_value
- created_at

## API Surface

### auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

### jobs

- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `DELETE /api/jobs/:id`

### billing

- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/webhooks/stripe`

## Pricing Strategy

### Simple starting model

- Free
  - limited uploads per month
  - smaller max file size
  - slower queue priority

- Pro
  - more minutes per month
  - larger file uploads
  - faster queue priority
  - export options

### Metering ideas

- charge by audio minute
- charge by monthly quota
- hybrid: monthly subscription plus overage

## Security Requirements

Before public launch, add:

- authenticated routes
- per-user job ownership checks
- upload size limits
- content-type validation
- rate limiting
- CSRF/session protection
- secrets management
- background job isolation
- logging and error monitoring

## Deployment Architecture

### Flow

1. User signs up
2. User uploads media
3. File is stored in object storage
4. Job record is created in PostgreSQL
5. Queue dispatches transcription work
6. Worker processes file
7. Transcript is saved
8. Dashboard shows completed result

## Migration Plan From This Repo

### Phase 1

Keep this repo as the prototype and create a new folder:

- `saas/`

Inside it:

- `saas/web`
- `saas/worker`
- `saas/shared`

### Phase 2

Rebuild only the core product flow first:

- auth
- billing
- uploads
- jobs table
- transcript results page

### Phase 3

Add premium polish:

- transcript exports
- team workspaces
- API tokens
- webhook delivery
- summaries and translations

## Best Immediate Next Step

Build the hosted MVP in this order:

1. Next.js app scaffold
2. user auth
3. PostgreSQL schema
4. upload flow to cloud storage
5. jobs dashboard
6. worker queue
7. Stripe subscription gating

## Practical Recommendation

Do not try to convert the existing PowerShell app directly into the production SaaS.

Instead:

- keep this version as your working prototype
- build the hosted product in a new `saas/` app beside it

That is the fastest route to a product you can actually sell without breaking the local version that already works.
