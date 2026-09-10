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
| `/`                  | **SSG** (`RenderMode.Prerender`) | Wordmark intro → Why → featured gallery   |
| `/tours`             | **SSG** (`RenderMode.Prerender`) | Tours placeholder                         |
| `/packages`          | **SSG** (`RenderMode.Prerender`) | Full horizontal gallery                   |
| `/about`             | **SSG** (`RenderMode.Prerender`) | About placeholder                         |
| `/contact`           | **SSG** (`RenderMode.Prerender`) | Contact placeholder                       |
| `/experiences/:slug` | **SSR** (`RenderMode.Server`)    | Detail placeholder (`slug` from the URL)  |
| `/reservations`      | **CSR** (`RenderMode.Client`)    | Plan your trip / reservations placeholder |

Client routes: [`src/app/app.routes.ts`](src/app/app.routes.ts).

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
    layout/                    # header, footer bounce, horiz gallery
    models/experience.ts
    models/reservation.ts
    services/experiences.ts    # empty list / getBySlug
  features/
    landing/                   # SSG home (DrawSVG hero, Why, gallery)
    tours/                     # SSG placeholder
    packages/                  # SSG full gallery
    about/                     # SSG placeholder
    contact/                   # SSG placeholder
    experiences/detail/        # SSR placeholder
    reservations/              # CSR placeholder
libs/ui/                       # Spartan helm copies
public/splashes/               # looping DrawSVG pages (not wired into Angular routes)
```

## Spartan/ui

Helm lives in `libs/ui` (`@spartan-ng/helm/<name>`). Theme: **stone**. `provideSpartanHlm()` is in `app.config.ts`.

```bash
npx ng g @spartan-ng/cli:ui tooltip --defaults --interactive=false --directory=libs/ui
```

## GSAP

Motion stays on GSAP only (no Lenis, no carousel). Plugins load on the client through [`afterNextGsap()`](src/app/core/animation/gsap.ts) (`morphSvg`, `drawSvg`, `splitText`, `scrollSmoother`). Do not register them at module top level.

- [`SmoothScroll`](src/app/core/animation/smooth-scroll.ts) creates `ScrollSmoother` on `#smooth-wrapper` / `#smooth-content` in the app shell. It is skipped for `prefers-reduced-motion`, jsdom, and coarse+narrow viewports. The header is pinned while the smoother is active because `position: sticky` does not hold inside transformed content.
- Home: the wordmark SVG is the hero. DrawSVG plays once per tab (`sessionStorage` `desertica-intro`), then the same mark settles. Why Desértica uses SplitText. Featured packages use a pin+scrub gallery.
- `/packages` reuses the same gallery with every package placeholder.
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
