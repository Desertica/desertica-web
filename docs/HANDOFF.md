# Handoff: Strapi CMS and cloud continuation

State as of `develop` @ the merge of the `strapi` branch.

## What exists

- `cms/`: Strapi 5 (TypeScript, locales `en`/`es`). Content types: destination, tour, translation, media-slot, page, blog-post, product, site-setting, reservation, contact-message. Public read permissions, create-only for the two form types, in-memory rate limiting, seed from `cms/seed/catalog.json` (3 destinations, 15 tours, 267 translations, 22 media slots, 7 pages).
- Angular reads it server-side through `CatalogService` with a static fallback (see `CLAUDE.md`).
- `cms/` is ready to become its own repository: it has no references to the frontend tree, its own CI (`cms/.github/workflows/ci.yml`), `.nvmrc`, `CONTRACT.md` and a README. The seed generator stays here and can write into the other repo.

## Running it

```bash
npm install && npm run cms:install
cp cms/.env.example cms/.env        # cloud sessions generate this automatically
npm run cms:dev                      # http://localhost:1337/admin, first run seeds the database
npm run start:cms                    # http://localhost:4200
```

The first visit to `/admin` asks for an admin user. Contact data in `site-setting` is placeholder (`XXXX`): edit it there.

## Moving the CMS to its own repository

1. Create an empty repo (for example `Desertica/desertica-cms`).
2. From this repo: `scripts/split-cms-repo.sh` creates the branch `cms-standalone` containing `cms/` as the root with its history.
3. `git push git@github.com:Desertica/desertica-cms.git cms-standalone:main`.
4. Check the new repo: `npm ci && npm run typecheck && npm run build` (the same steps its CI runs).
5. Back here, once the new repo is the source of truth: delete `cms/`, remove the `cms:*` and `start:cms` scripts from `package.json`, and point `STRAPI_URL` at the deployed CMS. To keep seeding it: `node scripts/build-cms-seed.mjs --out ../desertica-cms/seed/catalog.json`.
6. Configure the CMS deployment: `PUBLIC_URL`, `CLIENT_URLS` (frontend origin), `FORMS_PROXY_SECRET` (same as the frontend), a production database, and a webhook (`entry.publish`/`entry.unpublish`) that triggers the frontend deploy.

## Open work

- Create the CMS repository and deployment (not done; nothing here creates remote repositories).
- Upload real media to Strapi and replace placeholder contact data. Uploading files into `image`, `poster`, `webm`, `mp4` and `itineraryFile` has not been exercised; only the `*Url` fields are seeded.
- Verify tour videos coming from the CMS render in the browser (the SSR HTML of `/tours/dune-buggy` has no `<video>`; unclear whether the component only renders client-side).
- Deployment artifacts for the CMS (Dockerfile or platform config) are not written: Docker was not running locally so a build could not be verified. Postgres is configured in `cms/config/database.ts` but untested.
- The Strapi rate limiter is in memory per instance; use a shared store if the CMS runs on several instances.
- Placeholders that still exist in the app: `/experiences/:slug`, `/reservations`. A reservation currently opens WhatsApp and also stores the request in Strapi.
- Pre-existing: initial bundle over budget; 35 tests fail only on Node 26.
