# Platform MVP Blueprint

## Goal

Build a personal SaaS platform that can:

1. Host user websites
2. Auto-deploy uploaded files
3. Assign subdomains
4. Track traffic and conversions
5. Power landing pages for affiliate monetization

The other tools, like video generation and opportunity scanning, should plug into this core platform instead of being built as isolated apps.

## Recommended Build Order

### Phase 1: Hosting + Auto Deploy MVP

This is the foundation.

Deliverables:

- User authentication
- Create a project/site
- Upload a static site bundle
- Publish it automatically
- Serve it on a subdomain like `project.username.yourtool.com`
- Dashboard to view and manage projects

### Phase 2: Analytics + Conversion Tracking

Once sites are live, measure what happens on them.

Deliverables:

- Page view tracking
- Visitor sessions
- Referrer tracking
- Device and country breakdown
- Click event tracking
- Conversion tracking for affiliate links or product actions

### Phase 3: Landing Page Builder / Monetization Layer

Turn traffic into revenue.

Deliverables:

- Reusable landing page templates
- Redirect/link tracking
- Campaign tagging with UTM params
- Offer management
- Conversion dashboards

### Phase 4: Short Video Generator

Create traffic sources that feed landing pages.

Deliverables:

- Script input
- Text-to-speech
- Visual assembly
- Subtitle generation
- Export for TikTok/Reels/Shorts
- Campaign link attachment

### Phase 5: Opportunity Intelligence Tools

Add scanners after the monetization loop is working.

Deliverables:

- Affiliate opportunity finder
- Traffic opportunity finder
- Freelance/gig opportunity finder
- Alerts and ranking dashboards

## Recommended Stack

For a real product, use a standard web stack instead of extending the current PowerShell server.

- Frontend: Next.js
- Backend API: Next.js API routes or NestJS
- Database: PostgreSQL
- Cache / queues: Redis
- File storage: S3-compatible storage
- Background jobs: BullMQ or similar
- Reverse proxy / routing: Nginx or Caddy
- DNS: Cloudflare API
- Auth: NextAuth/Auth.js or Clerk
- Analytics storage: PostgreSQL first, optional ClickHouse later

## System Architecture

### Core Services

1. App dashboard
   Users create sites, deploy files, view analytics, and manage domains.

2. Deployment service
   Accepts uploaded zip files or folders, validates them, stores them, and marks a deploy as active.

3. Site serving layer
   Resolves incoming hostnames, finds the mapped site, and serves the published static files.

4. Domain service
   Assigns subdomains automatically and later supports custom domains.

5. Analytics collector
   Receives page-view, click, and conversion events from hosted sites and stores them.

6. Background worker
   Runs async jobs like deploy extraction, DNS verification, report generation, video creation, and opportunity scanning.

### Request Flow

1. User creates a project in the dashboard.
2. User uploads a deploy bundle.
3. Platform unpacks files and marks the deploy active.
4. Domain mapping points `project.username.yourtool.com` to the active deploy.
5. Visitor loads the site.
6. Embedded analytics script sends events back to the platform.
7. Dashboard displays traffic and conversion metrics.

## Data Model

### `users`

- `id`
- `email`
- `password_hash` or auth provider id
- `username`
- `created_at`

### `projects`

- `id`
- `user_id`
- `name`
- `slug`
- `description`
- `created_at`

### `deployments`

- `id`
- `project_id`
- `version`
- `status` (`uploaded`, `processing`, `ready`, `failed`, `active`)
- `storage_path`
- `entry_file` (usually `index.html`)
- `created_at`
- `activated_at`

### `domains`

- `id`
- `project_id`
- `host`
- `type` (`subdomain`, `custom`)
- `status` (`pending`, `active`, `verification_failed`)
- `is_primary`
- `created_at`

### `events`

- `id`
- `project_id`
- `deployment_id`
- `session_id`
- `event_type` (`pageview`, `click`, `conversion`)
- `path`
- `referrer`
- `country`
- `device_type`
- `browser`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `metadata_json`
- `created_at`

### `offers`

- `id`
- `project_id`
- `name`
- `destination_url`
- `affiliate_network`
- `tracking_code`
- `created_at`

### `tracked_links`

- `id`
- `project_id`
- `offer_id`
- `slug`
- `destination_url`
- `created_at`

### `jobs`

- `id`
- `job_type`
- `status`
- `payload_json`
- `result_json`
- `created_at`
- `completed_at`

## MVP API Surface

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

### Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`

### Deployments

- `POST /api/projects/:projectId/deployments`
- `GET /api/projects/:projectId/deployments`
- `POST /api/deployments/:deploymentId/activate`
- `GET /api/deployments/:deploymentId`

### Domains

- `GET /api/projects/:projectId/domains`
- `POST /api/projects/:projectId/domains`
- `POST /api/domains/:domainId/verify`

### Analytics

- `POST /api/events`
- `GET /api/projects/:projectId/analytics/overview`
- `GET /api/projects/:projectId/analytics/pages`
- `GET /api/projects/:projectId/analytics/referrers`
- `GET /api/projects/:projectId/analytics/conversions`

### Offers and tracked links

- `GET /api/projects/:projectId/offers`
- `POST /api/projects/:projectId/offers`
- `GET /r/:slug`

## Subdomain Strategy

For MVP:

- Platform root domain: `yourtool.com`
- Auto-assigned subdomain format: `project-username.yourtool.com`
- Wildcard DNS record: `*.yourtool.com` points to the app server
- Reverse proxy passes `Host` header to the app
- App resolves host to project/domain record

This avoids creating a DNS record per site.

## Custom Domain Strategy

Add this after MVP:

1. User enters domain like `www.userdomain.com`
2. App gives DNS instructions
3. User points CNAME or A record
4. App verifies DNS
5. SSL certificate is issued
6. Domain becomes primary or secondary for the project

## Analytics Collection Strategy

Each hosted site injects a lightweight script like:

```html
<script defer src="https://yourtool.com/tracker.js" data-site="project-id"></script>
```

The script can:

- Create anonymous session ids
- Send page views
- Track clicks on tagged links
- Capture referrers and UTM params
- Send conversion events on thank-you pages or redirect completions

## How the Other Tools Connect

### Landing Page / Affiliate Conversion System

Built directly on top of hosted projects, tracked links, and analytics.

### Traffic & Analytics Tool

Built directly on the `events` system and dashboard reporting.

### TikTok / Short Video Generator

Should output:

- video file
- caption
- CTA link
- destination project or landing page

This makes it a traffic engine for hosted landing pages.

### Affiliate / Online Earnings Suggestion Tool

Should feed suggested offers into the `offers` table and attach them to projects/campaigns.

### Traffic Opportunity Finder / Marketing Scout

Should create ranked opportunities with:

- source platform
- topic
- engagement score
- traffic estimate
- recommended landing page

### Freelance / Gig Opportunity Finder

Can be a separate module that reuses:

- background jobs
- alerting
- dashboard UI
- saved searches

## Suggested Milestones

### Milestone 1

- Set up Next.js app
- Add auth
- Add PostgreSQL schema
- Add project CRUD

### Milestone 2

- Add deployment uploads
- Extract and store static site files
- Serve active deployment by hostname

### Milestone 3

- Add wildcard subdomain routing
- Add project dashboard
- Add deployment history

### Milestone 4

- Add tracker script
- Add analytics API
- Add overview dashboard

### Milestone 5

- Add tracked links and conversion events
- Add offer management
- Add landing page templates

## Practical MVP Scope

If you want the fastest route to something usable, build only this first:

- accounts
- projects
- uploads
- auto-publish
- subdomain routing
- analytics overview
- tracked redirect links

That alone already gives you:

- a mini Vercel/Netlify for static sites
- a basic analytics platform
- a landing-page monetization base

## Recommendation For This Repo

The current repo is a good prototype style app, but not the right foundation for the full platform. The best next move is to create a new app inside this workspace for the MVP platform and keep the PowerShell transcription tool separate.

Recommended new folder:

- `platform/` for the new web product

Inside it:

- `apps/web`
- `apps/worker`
- `packages/db`
- `packages/shared`

## Best Next Step

Start with the Website Hosting + Auto Deployment MVP and ignore the scanners and video tool until sites, analytics, and conversions are working.

Once that base exists, the rest of your ideas become add-on engines instead of separate products.
