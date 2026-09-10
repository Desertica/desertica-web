# Desertica

Tourism booking frontend for desert experiences in Ica and Huacachina, Peru.

This repository is an **Angular 21** map: routes, render modes, and folders are in place. Feature pages are placeholders. Product copy, catalog, booking, and motion come later. Place names (Desertica, Ica, Huacachina) stay as proper nouns.

## Stack

| Piece | Role |
| --- | --- |
| Angular 21 (standalone, zoneless, 2025 file naming) | Application framework |
| `@angular/ssr` | Hybrid SSG / SSR / CSR |
| Tailwind CSS v4 | Utility styling |
| Spartan/ui (`@spartan-ng/brain` + helm in `libs/ui`) | Installed; not used on placeholders yet |
| GSAP 3 | Installed; helper in `core/animation`, unused |
| Vitest | Unit tests |

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

| Route | Mode | Status |
| --- | --- | --- |
| `/` | **SSG** (`RenderMode.Prerender`) | Landing placeholder |
| `/experiences/:slug` | **SSR** (`RenderMode.Server`) | Detail placeholder (`slug` from the URL) |
| `/reservations` | **CSR** (`RenderMode.Client`) | Reservations placeholder |

Client routes: [`src/app/app.routes.ts`](src/app/app.routes.ts).

## Architecture

```
src/app/
  app.ts / app.html / app.config.ts / app.config.server.ts
  app.routes.ts
  app.routes.server.ts
  core/
    animation/gsap.ts          # unused SSR-safe helper
    images/remote-image-loader.ts
    layout/                    # header + footer (nav only)
    models/experience.ts
    models/reservation.ts
    services/experiences.ts    # empty list / getBySlug
  features/
    landing/                   # SSG placeholder
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

[`afterNextGsap()`](src/app/core/animation/gsap.ts) is ready for later. Do not register ScrollTrigger at module top level.

## MCP servers

[`.cursor/mcp.json`](.cursor/mcp.json) and [`.vscode/mcp.json`](.vscode/mcp.json): `angular-cli`, `spartan-ui`, `gsap`.

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Dev server with hybrid rendering |
| `npm run build` | Production build + prerender |
| `npm run serve:ssr:desertica-web` | Serve the Node SSR bundle |
| `npm test` | Vitest |
