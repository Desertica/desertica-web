# Desertica

Tourism booking frontend for desert experiences in Ica and Huacachina, Peru.

Angular 21 frontend with SSR on every route. The home narrative (wordmark intro, Why, gallery) is GSAP; catalog, pages, blog and products come from Strapi, and the booking engine (checkout, payment links) is behind `BOOKING_ENGINE_ENABLED`. Place names (Desertica, Ica, Huacachina) stay as proper nouns.

## Stack

| Piece                                                | Role                                          |
| ---------------------------------------------------- | --------------------------------------------- |
| Angular 21 (standalone, zoneless, 2025 file naming)  | Application framework                         |
| `@angular/ssr`                                       | SSR on every route                            |
| Tailwind CSS v4                                      | Utility styling                               |
| Spartan/ui (`@spartan-ng/brain` + helm in `libs/ui`) | Helm copies in `libs/ui`                      |
| GSAP 3                                               | ScrollSmoother, DrawSVG, SplitText, MorphSVG  |
| Vitest                                               | Unit tests                                    |

## Requirements

- Node.js 22 (`engines` is `>=22 <25`)
- npm 10+ (`packageManager` is pinned in `package.json`)

Install uses `legacy-peer-deps=true` (see [`.npmrc`](.npmrc)).

```bash
npm install
npm start                 # http://localhost:4200
npm test
npm run build             # emits the browser bundle and the Node SSR server
npm run serve:ssr:desertica-web
```

## Mapped routes

Per-route modes live in [`src/app/app.routes.server.ts`](src/app/app.routes.server.ts). `outputMode` stays `server` in `angular.json`.

| Route                | Mode                             | Status                                    |
| -------------------- | -------------------------------- | ----------------------------------------- |
| `/`                  | **SSR** (`RenderMode.Server`) | Wordmark, Why, tour gallery, destinos, CTA |
| `/tours`             | **SSR** (`RenderMode.Server`) | Catalog by Huacachina, Paracas, Nazca     |
| `/tours/:id`         | **SSR** (`RenderMode.Server`) | Tour detail (`dune-buggy` is the first filled page) |
| `/products`          | **SSR** (`RenderMode.Server`)    | Products from Strapi (empty state until published) |
| `/products/:slug`    | **SSR** (`RenderMode.Server`)    | Product detail from Strapi                |
| `/about`             | **SSR** (`RenderMode.Server`) | About page                                |
| `/contact`           | **SSR** (`RenderMode.Server`) | Contact form (stored in Strapi or sent to the API) |
| `/blog`              | **SSR** (`RenderMode.Server`)    | Posts from Strapi (empty state until published) |
| `/blog/:slug`        | **SSR** (`RenderMode.Server`)    | Post detail from Strapi                   |
| `/nazca`             | **SSR** (`RenderMode.Server`) | Destination hub: Strapi page + its tours  |
| `/huacachina`        | **SSR** (`RenderMode.Server`) | Destination hub: Strapi page + its tours  |
| `/paracas`           | **SSR** (`RenderMode.Server`) | Destination hub: Strapi page + its tours  |
| `/terms`             | **SSR** (`RenderMode.Server`) | Legal page from Strapi (`page` entry)     |
| `/privacy`           | **SSR** (`RenderMode.Server`) | Legal page from Strapi (`page` entry)     |
| `/complaints`        | **SSR** (`RenderMode.Server`) | Libro de Reclamaciones form (files through the API) |
| `/conduct`           | **SSR** (`RenderMode.Server`) | Legal page from Strapi (`page` entry)     |
| `/cancellation`      | **SSR** (`RenderMode.Server`) | Legal page from Strapi (`page` entry)     |
| `/cookies`           | **SSR** (`RenderMode.Server`) | Legal page from Strapi (`page` entry)     |
| `/legal/mincetur`    | **SSR** (`RenderMode.Server`) | Legal page from Strapi (`page` entry)     |
| `/experiences`, `/experiences/:slug` | Express **301** | Permanent redirect to `/tours`, `/tours/:slug` |
| `/sitemap.xml`, `/robots.txt` | Express          | Built from the live catalog (see `src/seo-routes.ts`) |
| `/checkout`, `/checkout/payment/:reference`, `/booking[/:reference]`, `/pay/:token`, `/waiver/:token`, `/payment/3ds` | **SSR** | Booking engine and the e-mailed links (payment link, waiver, 3DS return); only with `BOOKING_ENGINE_ENABLED=true` |
| `/reservations`      | Express **301**               | Permanent redirect to `/tours` (the static page was retired) |
| `/healthz`           | Express                       | Liveness probe for Docker: `200 ok`, no render, no `Host` check |

Client routes: [`src/app/app.routes.ts`](src/app/app.routes.ts).

SEO: `SeoService` writes canonical, `hreflang`, Open Graph, Twitter and JSON-LD for every route. Every page lives under a language prefix (`/en/tours`, `/es/tours`; the home page is `/en/` and `/es/`); the strategy and how it works are in [`docs/SEO-LOCALE.md`](docs/SEO-LOCALE.md). The routes in the table above are written without the prefix.

Every route renders per request (`RenderMode.Server`) and reads Strapi through a short server-side cache, so publishing a change needs no rebuild and the build does not depend on the CMS.

## Architecture

```
src/app/
  app.ts / app.html / app.config.ts / app.config.server.ts
  app.routes.ts
  app.routes.server.ts
  core/
    animation/gsap.ts          # SSR-safe GSAP + plugin flags
    animation/smooth-scroll.ts # ScrollSmoother on the app shell
    animation/gsap-ui.ts       # hover timelines (no ScrollTrigger)
    images/remote-image-loader.ts
    catalog/tours.ts           # Huacachina / Paracas / Nazca catalog
    catalog/tour-pages.ts      # Per-tour detail content (dune-buggy first)
    layout/                    # header, footer bounce, horiz gallery
    models/reservation.ts
    catalog/catalog.ts         # CatalogService: Strapi content with static fallback
    cms/                       # Strapi client, mapper, forms API, site defaults
    seo/                       # SeoService (canonical, hreflang, OG, JSON-LD) + usePageMeta
    analytics/                 # consent, GTM, typed dataLayer events, attribution
  features/
    landing/                   # Home (DrawSVG hero, Why, gallery, destinos, CTA)
    tours/                     # Tours catalog
    tours/detail/              # Tour page (`/tours/:id`)
    about/                     # Page
    contact/                   # Page
    content/                   # CMS page (legal, destination hubs)
    blog/                      # Strapi posts (SSR)
    products/                  # Strapi products (SSR)
    booking/, payment/         # booking engine (checkout, my booking, payment step)
    complaints/                # Libro de Reclamaciones
src/server.ts                  # Express: headers, /healthz, redirects, proxies, static files, SSR
src/healthz.ts                 # /healthz probe
src/security-headers.ts        # Content-Security-Policy-Report-Only with per-page script hashes
src/seo-routes.ts              # sitemap.xml, robots.txt, legacy 301s
src/locale-routes.ts           # language prefix redirects (/tours -> /en/tours)
src/page-cache.ts              # 10 s in-memory cache of rendered public pages
src/forms-proxy.ts             # /api/forms/* -> Strapi or the API (validation + rate limit)
src/forms-validation.ts        # field specs for those forms
src/api-proxy.ts               # /api/public/* -> desertica-api (booking engine)
src/image-proxy.ts             # /_img: resizes CMS images to WebP
src/rate-limit.ts, src/image-widths.ts
scripts/build-cms-seed.mjs     # regenerates the CMS seed (../desertica-cms/seed/catalog.json) from the static catalog
libs/ui/                       # Spartan helm copies
public/brand/                  # mark and lockup
public/legal/                  # MINCETUR distintivo + INDECOPI AvisoVirtual
```

## Strapi CMS

All content lives in Strapi 5, in its own repository: [Desertica/desertica-cms](https://github.com/Desertica/desertica-cms) (private). Its `CONTRACT.md` lists every field this app reads; `docs/DEPLOY.md` there covers deployment.

| Area in the admin | Drives                                                                         |
| ----------------- | ------------------------------------------------------------------------------ |
| `Catalog`         | Destinations and tours (the base tour page is filled per tour), featured set, footer order |
| `Copy`            | Every UI string, grouped by page and section; overrides `src/locales/*.json`   |
| `Media`           | Banners, About video and images, footer stamps, home/blog/products heroes      |
| `Pages`           | Terms, privacy, complaints, conduct, MINCETUR and destination hub copy         |
| `Blog`, `Shop`    | `/blog` and `/products`                                                        |
| `Site`            | Contact data, socials, legal entity, **theme** (light/dark palettes, radius, fonts, header height, intro), **booking rules** (deposit, party limits, assurances), **form limits**, **navigation** (header, footer, CTA) |
| `Inbox`           | Reservations and contact messages sent from the site                           |

```bash
git clone https://github.com/Desertica/desertica-cms.git ../desertica-cms
npm --prefix ../desertica-cms install && cp ../desertica-cms/.env.example ../desertica-cms/.env   # fill the secrets
npm run cms:dev            # http://localhost:1337/admin (seeds the catalog on first run)
npm run start:cms          # Angular at :4200 reading Strapi
```

The app only talks to Strapi when `STRAPI_URL` is set on the server ([`.env.example`](.env.example)); without it, the bundled static catalog and defaults are used. If Strapi is unreachable the last good response is served, and if there is none the static data takes over. Text from Strapi is registered as an i18n overlay (`cms.tours.<slug>.title`, ...), so templates keep using the `translate` pipe. The theme is written into a `<style id="cms-theme">` tag. Forms go browser -> `/api/forms/*` (Express) -> Strapi, so the browser never needs the CMS URL. Deployment of this app: [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Spartan/ui

Helm lives in `libs/ui` (`@spartan-ng/helm/<name>`). Theme: **stone**. `provideSpartanHlm()` is in `app.config.ts`.

```bash
npx ng g @spartan-ng/cli:ui tooltip --defaults --interactive=false --directory=libs/ui
```

## GSAP

Motion stays on GSAP only (no Lenis, no carousel). Plugins load on the client through [`afterNextGsap()`](src/app/core/animation/gsap.ts) (`morphSvg`, `drawSvg`, `splitText`, `scrollSmoother`). Do not register them at module top level.

- [`SmoothScroll`](src/app/core/animation/smooth-scroll.ts) creates `ScrollSmoother` on `#smooth-wrapper` / `#smooth-content` in the app shell. It is skipped for `prefers-reduced-motion`, jsdom, and coarse+narrow viewports. The header is pinned while the smoother is active because `position: sticky` does not hold inside transformed content.
- Home: the wordmark SVG is the hero. DrawSVG plays once per tab (`sessionStorage` `desertica-intro`), then the same mark settles. Why Desértica uses SplitText. Featured tours use a pin+scrub gallery, then three destination cards and a closing CTA.
- `/tours` lists every tour by destination. Cards, header, footer, and the home gallery go to `/tours/:id`. Destination headings still use `/tours#huacachina`.
- Footer bounce (MorphSVG) waits for the smoother proxy via `whenReady()`.

## MCP servers

[`.cursor/mcp.json`](.cursor/mcp.json) and [`.vscode/mcp.json`](.vscode/mcp.json): `angular-cli`, `spartan-ui`, `gsap`.

## Scripts

| Script                            | Description                      |
| --------------------------------- | -------------------------------- |
| `npm start`                       | Dev server with hybrid rendering |
| `npm run build`                   | Production build (browser + SSR server) |
| `npm run serve:ssr:desertica-web` | Serve the Node SSR bundle        |
| `npm test`                        | Vitest                           |
| `npm run start:cms`               | Dev server reading Strapi on :1337 |
| `npm run cms:dev`                 | Strapi dev server (sibling `../desertica-cms`) |
| `npm run cms:seed`                | Regenerate the CMS seed in `../desertica-cms` |
