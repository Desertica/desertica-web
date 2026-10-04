# Desertica web

Tourism booking site for desert tours in Ica, Huacachina, Paracas and Nazca (Peru). Angular 21 (standalone, zoneless, SSR/SSG), Tailwind v4, Spartan/ui (`libs/ui`), GSAP, Vitest. Content comes from a Strapi 5 CMS that lives in its own repo, `Desertica/desertica-cms` (clone it next to this one as `../desertica-cms`), with a static fallback. Read `README.md` for routes and `docs/HANDOFF.md` for the current state and open work.

## Commands

```bash
npm install                                # once (cloud sessions do this in a SessionStart hook)
npm start                                  # Angular on :4200, static catalog
npm run cms:dev                            # Strapi from ../desertica-cms on :1337 (seeds an empty database)
npm run start:cms                          # Angular reading Strapi (STRAPI_URL=http://localhost:1337)
npm test                                   # ng test (Vitest)
npm run build                              # prerender + Node server; add STRAPI_URL to bake CMS content
```

Use **Node 22**. On Node 26 about 35 tests fail with `localStorage` undefined, and that is an environment issue, not a code bug.

## How the CMS is wired

- `CatalogService` (`src/app/core/catalog/catalog.ts`) is the single source for destinations, tours, site settings, media slots, pages, posts and products. Components must use it, not `tourDestinations`/`catalogTours` from `tours.ts` (those are only the static fallback).
- On the server it fetches Strapi through `CmsApi` (cached per `STRAPI_CACHE_TTL_MS`, last good snapshot on failure), maps it with `cms-mapper.ts`, and passes the snapshot to the browser in TransferState. No `STRAPI_URL` means static data only.
- CMS text is an i18n overlay: tours/destinations become keys like `cms.tours.<slug>.title`, and the `translation` collection overrides any key in `src/locales/*.json`. Templates keep using the `translate` pipe. The overlay lives in `I18nService` (per request) and not in module scope, so SSR requests never share it.
- Forms go browser -> `POST /api/forms/{contact,reservation}` (`src/forms-proxy.ts`, validated in `src/forms-validation.ts`) -> Strapi. The browser never needs the CMS URL.
- Everything editable belongs in Strapi: theme tokens, booking numbers, form limits, navigation, SEO, copy and media all have a CMS source with the old value as default (`core/cms/booking-defaults.ts`, `site-defaults.ts`). New content needs a CMS field plus a mapper entry, not a constant in the code.
- Strapi field names are a contract with `cms-mapper.ts`: see `CONTRACT.md` in the CMS repo. Changing one means changing both sides plus `scripts/build-cms-seed.mjs` and the mapper spec.
- `populate=*` does not reach media nested in components; `POPULATE` in `cms-api.ts` lists the explicit paths.

## Conventions

- Every user-facing string needs an entry in both `src/locales/en.json` and `es.json`.
- Match the surrounding code; Prettier config is in `.prettierrc`. New code gets a spec next to it.
- Rendering modes per route are in `src/app/app.routes.server.ts`. SSG pages freeze CMS content at build time; `/blog`, `/products` and `/tours/:id` for tours added later are rendered per request.
- Do not commit `.cursor/`, `.vscode/` or `.env` files.
- Commit messages: short imperative subject, then a body when the change needs it. No attribution lines.

## Pitfalls

- `inject()` inside a `computed()` throws NG0203: inject into a field first.
- The Strapi rate limiter keys on IP. Behind the Express proxy every visitor shares one IP unless `FORMS_PROXY_SECRET` is the same in both apps.
- The initial bundle already exceeds the 600 kB budget (warning, not an error).
- A CMS-created destination has no route of its own until one is added in `app.routes.ts`.
