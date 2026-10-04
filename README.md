# Desertica

Tourism booking frontend for desert experiences in Ica and Huacachina, Peru.

This repository is an **Angular 21** map: routes, render modes, and folders are in place. The home narrative (wordmark intro, Why, gallery) is GSAP. Catalog and booking stay placeholders. Place names (Desertica, Ica, Huacachina) stay as proper nouns.

## Stack

| Piece                                                | Role                                          |
| ---------------------------------------------------- | --------------------------------------------- |
| Angular 21 (standalone, zoneless, 2025 file naming)  | Application framework                         |
| `@angular/ssr`                                       | Hybrid SSG / SSR / CSR                        |
| Tailwind CSS v4                                      | Utility styling                               |
| Spartan/ui (`@spartan-ng/brain` + helm in `libs/ui`) | Helm copies in `libs/ui`                      |
| GSAP 3                                               | ScrollSmoother, DrawSVG, SplitText, MorphSVG  |
| Vitest                                               | Unit tests                                    |

## Requirements

- Node.js 20+
- npm 10+ (`packageManager` is pinned in `package.json`)

Install uses `legacy-peer-deps=true` (see [`.npmrc`](.npmrc)).

```bash
npm install
npm start                 # http://localhost:4200
npm test
npm run build             # prerenders `/` and emits a Node server
npm run serve:ssr:desertica-web
```

## Mapped routes

Per-route modes live in [`src/app/app.routes.server.ts`](src/app/app.routes.server.ts). `outputMode` stays `server` in `angular.json`.

| Route                | Mode                             | Status                                    |
| -------------------- | -------------------------------- | ----------------------------------------- |
| `/`                  | **SSG** (`RenderMode.Prerender`) | Wordmark, Why, tour gallery, destinos, CTA |
| `/tours`             | **SSG** (`RenderMode.Prerender`) | Catalog by Huacachina, Paracas, Nazca     |
| `/tours/:id`         | **SSG** (`RenderMode.Prerender`) | Tour detail (`dune-buggy` is the first filled page) |
| `/products`          | **SSR** (`RenderMode.Server`)    | Products from Strapi (empty state until published) |
| `/products/:slug`    | **SSR** (`RenderMode.Server`)    | Product detail from Strapi                |
| `/about`             | **SSG** (`RenderMode.Prerender`) | About placeholder                         |
| `/contact`           | **SSG** (`RenderMode.Prerender`) | Contact placeholder                       |
| `/blog`              | **SSR** (`RenderMode.Server`)    | Posts from Strapi (empty state until published) |
| `/blog/:slug`        | **SSR** (`RenderMode.Server`)    | Post detail from Strapi                   |
| `/nazca`             | **SSG** (`RenderMode.Prerender`) | Destination hub: Strapi page + its tours  |
| `/huacachina`        | **SSG** (`RenderMode.Prerender`) | Destination hub: Strapi page + its tours  |
| `/paracas`           | **SSG** (`RenderMode.Prerender`) | Destination hub: Strapi page + its tours  |
| `/terms`             | **SSG** (`RenderMode.Prerender`) | Legal page from Strapi (`page` entry)     |
| `/privacy`           | **SSG** (`RenderMode.Prerender`) | Legal page from Strapi (`page` entry)     |
| `/complaints`        | **SSG** (`RenderMode.Prerender`) | Legal page from Strapi (`page` entry)     |
| `/conduct`           | **SSG** (`RenderMode.Prerender`) | Legal page from Strapi (`page` entry)     |
| `/legal/mincetur`    | **SSG** (`RenderMode.Prerender`) | Legal page from Strapi (`page` entry)     |
| `/experiences/:slug` | **SSR** (`RenderMode.Server`)    | Detail placeholder (`slug` from the URL)  |
| `/reservations`      | **CSR** (`RenderMode.Client`)    | Plan your trip / reservations placeholder |

Client routes: [`src/app/app.routes.ts`](src/app/app.routes.ts).

SSG pages bake the CMS content in at build time (rebuild after publishing, e.g. from a Strapi webhook). SSR pages (`/blog`, `/products`, `/tours/:id` for tours created after the build) read Strapi per request through a short server-side cache.

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
    models/experience.ts
    models/reservation.ts
    services/experiences.ts    # empty list / getBySlug
    catalog/catalog.ts         # CatalogService: Strapi content with static fallback
    cms/                       # Strapi client, mapper, forms API, site defaults
    seo/page-meta.ts           # title/description per page
  features/
    landing/                   # SSG home (DrawSVG hero, Why, gallery, destinos, CTA)
    tours/                     # SSG catalog
    tours/detail/              # SSG tour page (`/tours/:id`)
    about/                     # SSG placeholder
    contact/                   # SSG placeholder
    content/                   # CMS page (legal, destination hubs)
    blog/                      # Strapi posts (SSR)
    products/                  # Strapi products (SSR)
    experiences/detail/        # SSR placeholder
    reservations/              # CSR placeholder
src/forms-proxy.ts             # /api/forms/* -> Strapi (validation + rate limit)
cms/                           # Strapi 5 project (see cms/README.md)
scripts/build-cms-seed.mjs     # regenerates cms/seed/catalog.json from the static catalog
libs/ui/                       # Spartan helm copies
public/brand/                  # mark and lockup
public/legal/                  # MINCETUR distintivo + INDECOPI AvisoVirtual
public/splashes/               # looping DrawSVG pages (not wired into Angular routes)
```

## Strapi CMS

Everything editable lives in [`cms/`](cms/README.md) (Strapi 5, TypeScript, locales `en`/`es`):

| Content type    | Drives                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| `destination`   | Destination titles, leads, hub pages, order                               |
| `tour`          | Catalog, tour pages (itinerary, highlights, gallery, price), featured set |
| `translation`   | Every UI string (`key` = the i18n key, e.g. `nav.blog`); overrides the JSON catalogs |
| `media-slot`    | Banners, About video/images, footer stamps (`tours.banner`, `about.trio`, ...) |
| `page`          | Terms, privacy, complaints, conduct, MINCETUR, products/blog intros, hubs |
| `blog-post`     | `/blog`                                                                   |
| `product`       | `/products`                                                               |
| `site-setting`  | Email, phone, WhatsApp, social links, legal name and RUC                  |
| `reservation`   | Booking requests sent from the tour page (also opens WhatsApp)            |
| `contact-message` | Messages from `/contact`                                                |

```bash
npm run cms:install        # once
cp cms/.env.example cms/.env   # fill the secrets
npm run cms:dev            # http://localhost:1337/admin (seeds the catalog on first run)
npm run start:cms          # Angular at :4200 reading Strapi
```

The app only talks to Strapi when `STRAPI_URL` is set on the server ([`.env.example`](.env.example)); without it, the bundled static catalog is used. If Strapi is unreachable the last good response is served, and if there is none the static catalog takes over. Text from Strapi is registered as an i18n overlay (`cms.tours.<slug>.title`, ...), so templates keep using the `translate` pipe. Forms go browser -> `/api/forms/*` (Express) -> Strapi, so the browser never needs the CMS URL.

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

[`public/splashes/`](public/splashes/) are looping HTML pages and are not routed.

## MCP servers

[`.cursor/mcp.json`](.cursor/mcp.json) and [`.vscode/mcp.json`](.vscode/mcp.json): `angular-cli`, `spartan-ui`, `gsap`.

## Scripts

| Script                            | Description                      |
| --------------------------------- | -------------------------------- |
| `npm start`                       | Dev server with hybrid rendering |
| `npm run build`                   | Production build + prerender     |
| `npm run serve:ssr:desertica-web` | Serve the Node SSR bundle        |
| `npm test`                        | Vitest                           |
| `npm run start:cms`               | Dev server reading Strapi on :1337 |
| `npm run cms:dev` / `cms:build`   | Strapi dev server / admin build  |
| `npm run cms:seed`                | Regenerate `cms/seed/catalog.json` |
