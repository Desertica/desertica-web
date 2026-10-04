# Handoff

State as of the `feat/strapi-global-content` work on top of `develop`.

## Repositories

- `Desertica/desertica-web` (this repo, public): Angular 21 frontend.
- `Desertica/desertica-cms` (private): Strapi 5 CMS, seeded from this app's static catalog. It has its own `CLAUDE.md`, `CONTRACT.md`, CI, Dockerfile and `docs/DEPLOY.md`. Clone it next to this repo as `../desertica-cms` for local work.

## What is driven by Strapi

Destinations and tours (base page per tour), UI copy by page/section, media slots, pages, blog, products, site settings, theme (palettes, radius, fonts, header heights, intro), booking rules and assurances, form limits, navigation, SEO, and the inbox for reservations and contact messages. The app keeps the previous values as defaults when a field is empty or the CMS is unreachable.

Intentionally not in the CMS: the animated wordmark and brand SVGs, the Peru map SVG, country/phone data, and the list of locales (`en`/`es`).

## Running it

```bash
npm install
git clone https://github.com/Desertica/desertica-cms.git ../desertica-cms
npm --prefix ../desertica-cms install && cp ../desertica-cms/.env.example ../desertica-cms/.env
npm run cms:dev          # Strapi on :1337; first run seeds the database
npm run start:cms        # Angular on :4200 reading Strapi
```

The first visit to `/admin` asks for an admin user. Contact data in `Site — Settings` is placeholder (`XXXX`).

## Ola 1 (tracking, SEO, booking engine, complaints)

- **Tracking**: `core/analytics/` (consent, GTM loader, typed `AnalyticsService`, first-touch attribution) and the cookie banner. GTM loads in the browser only, after the denied Consent Mode default. Events follow `docs/analytics-events.md` in `desertica-api`.
- **SEO**: `core/seo/` (`SeoService`, `usePageMeta`), `src/seo-routes.ts` (sitemap, robots, `/experiences` 301). Language strategy and the path-prefix plan: `docs/SEO-LOCALE.md`.
- **Booking engine** (`BOOKING_ENGINE_ENABLED`, off by default): `core/api` (generated types + `BookingApi`), `core/booking`, `features/booking`, `src/api-proxy.ts`. Regenerate types with `npm run api:generate` (needs `../desertica-api`). Payment is described under Ola 2.
- **Libro de Reclamaciones**: `features/complaints`, validated in `src/forms-validation.ts`, filed through `/api/forms/complaint` (needs `API_URL`). Legal wording is provisional until the lawyer reviews it.
- Environment: see `.env.example` (`SITE_URL`, `GTM_ID`, `API_URL`, `BOOKING_ENGINE_ENABLED`, `TURNSTILE_*`, `CULQI_PUBLIC_KEY`, `ROBOTS_DISALLOW_ALL`).

## Ola 2 (payments, e-mailed links, CMS fields)

- **Payment step** (`features/payment/payment-step.ts`, shared by `/checkout/payment/:reference` and `/pay/:token`): the booking's `paymentOptions` say which gateways and kinds are open; amounts come from the booking (`totalCents`, `depositCents`, `pendingCents`), never from `depositRate`. Stripe mounts the Express Checkout Element (Apple Pay, Google Pay) and the Payment Element (card) from the API's `clientSecret` and `publishableKey`, USD only. Culqi opens Culqi.js with `CULQI_PUBLIC_KEY` and sends the token to `culqi-charge`, with the 3DS retry. The browser never decides a payment succeeded: it polls "my booking" until `paidCents` grows (60 s) and otherwise says "pending".
- **Third-party scripts** (`core/payments`): Stripe.js (`js.stripe.com`) loads when the visitor continues with Stripe, Culqi.js and Culqi 3DS (`checkout.culqi.com`, `3ds.culqi.com`) when Culqi is picked. They are not analytics and ignore the cookie banner. There is no CSP yet; when one is added it must allow `js.stripe.com`, `*.stripe.com` frames and `api.stripe.com`, and `*.culqi.com`.
- **E-mailed links**: `/booking/:ref?token=` (token moves to sessionStorage and leaves the URL), `/waiver/:token` (text = the tour's CMS `waiverBody`; the form stays closed without it) and `/pay/:token`. Those responses send `Referrer-Policy: no-referrer`, robots disallows them, and GTM does not load on a visit that starts on a URL with a credential (`isCredentialUrl`).
- **Proxy**: `/api/public/*` allows the payment, payment-link and waiver operations. Routes whose path is a secret (links, waivers) count against the write limit, the query string is dropped except on availability and legal documents, and ids are `[A-Za-z0-9_-]{1,128}`.
- **Analytics**: `purchase` uses `transaction_id` = `event_id` = `<reference>-<n>` (`PurchaseTracker`; n counts payments already reported in this browser). `anonymousId` is the cookie-consent id: it is created with the first decision, filed through `/public/consents` and sent when the booking is created.
- **CMS**: `latitude`, `longitude`, `meetingPointUrl`, `faqs` (populate `faqs`), `waiverBody`, and the `cancellation` and `cookies` pages. FAQ markup (`FAQPage`) is emitted only with the visible questions; coordinates feed `geo` on the trip and a map link. `availabilityMonths` is read when the CMS exposes it and defaults to 3 (no `claude/ola2-cms` branch existed yet).
- **Unverified against the real thing** (docs for Stripe and Culqi were not reachable from the build environment, the real API and gateways were not run): the Culqi 3DS return page and its `postMessage` hand-off follow Culqi's public PHP demo; `deviceId` and `authentication3DS` on the second charge are not in the contract yet. Test both in the gateways' sandboxes before turning the flag on.

## Open work

- Deploy both apps (see `docs/DEPLOY.md` here and in the CMS repo). No webhook or rebuild is needed after publishing: pages render per request.
- Fill real content: media, contact data, legal pages, tours beyond `dune-buggy`.
- `/experiences/:slug` and `/reservations` are still placeholders. A reservation opens WhatsApp and also stores the request in Strapi.
- Pre-existing: the initial bundle is over budget; 35 tests fail only on Node 26 (use Node 22).
