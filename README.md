# Desertica

Tourism booking frontend for desert experiences in Ica and Huacachina, Peru.

The app is an **Angular 21** workspace with hybrid rendering, **Spartan/ui** (brain + helm), **Tailwind CSS v4**, and **GSAP**. All product copy, comments, and docs in this repository are English. Place names (Desertica, Ica, Huacachina) stay as proper nouns.

## Stack

| Piece | Role |
| --- | --- |
| Angular 21 (standalone, zoneless, 2025 file naming) | Application framework |
| `@angular/ssr` | Hybrid SSG / SSR / CSR |
| Tailwind CSS v4 | Utility styling |
| Spartan/ui (`@spartan-ng/brain` + helm in `libs/ui`) | Accessible UI primitives |
| GSAP 3 | Landing motion (browser only) |
| Vitest | Unit tests |

There is no backend yet. Experiences are mocked in [`src/app/core/services/experiences.ts`](src/app/core/services/experiences.ts).

## Requirements

- Node.js 20+
- npm 10+ (`packageManager` is pinned in `package.json`)

Install uses `legacy-peer-deps=true` (see [`.npmrc`](.npmrc)) because npm 10 currently fails to resolve Vitest 4 peer graphs without it.

```bash
npm install
npm start                 # http://localhost:4200
npm test
npm run build             # prerenders `/` and emits a Node server
npm run serve:ssr:desertica-web
```

## Hybrid rendering

Per-route modes live in [`src/app/app.routes.server.ts`](src/app/app.routes.server.ts). `outputMode` stays `server` in `angular.json` so SSG, SSR, and CSR can coexist.

| Route | Mode | Why |
| --- | --- | --- |
| `/` | **SSG** (`RenderMode.Prerender`) | Marketing landing is the same for every visitor; HTML is generated at build time. |
| `/experiences/:slug` | **SSR** (`RenderMode.Server`) | Detail pages need SEO and can vary by inventory later. |
| `/reservations` | **CSR** (`RenderMode.Client`) | Booking is personal, form-heavy, and should not be indexed. |

Client routes (lazy-loaded features) are in [`src/app/app.routes.ts`](src/app/app.routes.ts).

## Architecture

Angular feature layout. Files follow the 2025 style guide (`app.ts`, not `app.component.ts`). Components are standalone, use `inject()`, signals, and `ChangeDetectionStrategy.OnPush`.

```
src/app/
  app.ts / app.html / app.config.ts / app.config.server.ts
  app.routes.ts
  app.routes.server.ts
  core/
    animation/gsap.ts          # afterNextRender + dynamic GSAP import
    images/remote-image-loader.ts
    layout/                    # header + footer
    models/experience.ts
    models/reservation.ts
    services/experiences.ts    # mock catalog
  features/
    landing/                   # SSG
    experiences/detail/        # SSR
    reservations/              # CSR
libs/ui/                       # Spartan helm copies (owned by this repo)
```

Conventions:

- No NgModules
- Route-level `loadComponent` lazy loading
- `input()` / `computed()` instead of decorator inputs where possible
- Native control flow (`@if`, `@for`)
- GSAP never runs on the server — see `afterNextGsap()` in `core/animation/gsap.ts`

## Spartan/ui

Helm styles are copied into `libs/ui` and imported via `@spartan-ng/helm/<name>` (paths in `tsconfig.json`). Brain primitives stay on npm as `@spartan-ng/brain`.

Theme: **stone** (warm desert palette) in `src/styles.css`. Overlay fix for Angular 21 CDK: `provideSpartanHlm()` in `app.config.ts`.

Add another component:

```bash
npx ng g @spartan-ng/cli:ui tooltip --defaults --interactive=false --directory=libs/ui
```

Installed helm pieces: `button`, `card`, `badge`, `input`, `label`, `select`, `separator`, `sheet`, `dialog`, `sonner`, `calendar`, `field`, `skeleton`, `utils`.

## GSAP

Use `afterNextGsap()` from [`src/app/core/animation/gsap.ts`](src/app/core/animation/gsap.ts):

1. It waits for `afterNextRender` (browser only).
2. It dynamically imports `gsap` and `ScrollTrigger`.
3. It registers plugins, runs your `gsap.context()`, and reverts on destroy.

Do not call `gsap.registerPlugin(ScrollTrigger)` at module top level — that path executes during SSR.

## MCP servers

Project MCP config: [`.cursor/mcp.json`](.cursor/mcp.json) (Cursor) and [`.vscode/mcp.json`](.vscode/mcp.json) (VS Code). Enable them in **Cursor → Settings → Tools & MCP**.

| Server | Package | Purpose |
| --- | --- | --- |
| `angular-cli` | `npx -y @angular/cli mcp` | Official Angular CLI tools and best practices |
| `spartan-ui` | `npx -y @spartan-ng/mcp` | Official Spartan docs, components, and blocks |
| `gsap` | `npx -y @vinhnguyen/gsap-mcp` | Community GSAP API helper (GreenSock does not ship an official MCP) |

Cloud Agents may need these commands on the environment MCP allowlist before the tools appear in a remote run.

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Dev server with hybrid rendering |
| `npm run build` | Production build + prerender |
| `npm run serve:ssr:desertica-web` | Serve the Node SSR bundle |
| `npm test` | Vitest via the Angular unit-test builder |

Local SSR checks the `Host` header. [`angular.json`](angular.json) allows `localhost` and `127.0.0.1` (with ports 4200 and 4000) under `projects.desertica-web.architect.build.options.security.allowedHosts`. Add production hostnames there before deploying the Node server.
