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
- **Booking engine** (`BOOKING_ENGINE_ENABLED`, off by default): `core/api` (generated types + `BookingApi`), `core/booking`, `features/booking`, `src/api-proxy.ts`. Regenerate types with `npm run api:generate` (needs `../desertica-api`). Payment is a placeholder until Ola 2.
- **Libro de Reclamaciones**: `features/complaints`, validated in `src/forms-validation.ts`, filed through `/api/forms/complaint` (needs `API_URL`). Legal wording is provisional until the lawyer reviews it.
- Environment: see `.env.example` (`SITE_URL`, `GTM_ID`, `API_URL`, `BOOKING_ENGINE_ENABLED`, `TURNSTILE_*`, `ROBOTS_DISALLOW_ALL`).

## Open work

- Deploy both apps (see `docs/DEPLOY.md` here and in the CMS repo). No webhook or rebuild is needed after publishing: pages render per request.
- Fill real content: media, contact data, legal pages, tours beyond `dune-buggy`.
- `/experiences/:slug` and `/reservations` are still placeholders. A reservation opens WhatsApp and also stores the request in Strapi.
- Pre-existing: the initial bundle is over budget; 35 tests fail only on Node 26 (use Node 22).
