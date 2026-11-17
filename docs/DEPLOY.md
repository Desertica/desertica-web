# Deploying the site

The site is a Node server (Angular SSR + the forms proxy) that reads content from Strapi. Deploy the CMS first: see `docs/DEPLOY.md` in `Desertica/desertica-cms`.

## Image

`Dockerfile` builds a multi-stage image (Node 22, non-root; the `HEALTHCHECK` calls `/healthz`, a plain `200 ok` that skips rendering and the `Host` check). CI (`.github/workflows/ci.yml`) only checks that the image builds; it does not publish it. Locally:

```bash
docker build -t desertica-web .
docker run -p 4000:4000 -e NG_ALLOWED_HOSTS=localhost -e SITE_URL=http://localhost:4000 desertica-web
```

## Runtime configuration (environment)

| Variable | Required | Meaning |
| --- | --- | --- |
| `NG_ALLOWED_HOSTS` | yes | Comma-separated hostnames the server answers to (e.g. `desertica.pe,www.desertica.pe`). Any other `Host` gets 400 (SSRF protection). Defaults only cover `localhost`. |
| `STRAPI_URL` | to use the CMS | URL the server uses to reach Strapi (private network URL is fine). Empty = bundled static catalog. |
| `STRAPI_PUBLIC_URL` | yes in production with `STRAPI_URL` | URL browsers use to load uploaded media. Defaults to `STRAPI_URL`. |
| `FORMS_PROXY_SECRET` | recommended | Same value as in the CMS. Signs the editor's draft preview links. At least 32 characters in production. |
| `TRUST_PROXY` | yes in production | Number of proxies in front of the app: `1` behind Traefik/Coolify, `2` with Cloudflare in front too. Plain `true` trusts the whole `X-Forwarded-For` header, so a client can pick its own IP and skip the rate limits; do not use it in production. |
| `SITE_URL` | yes in production | Public origin, no trailing slash (for example `https://desertica.pe`). Canonical, hreflang, sitemap, robots and JSON-LD use it. The server refuses to start in production without it; outside production it falls back to the request `Host`. |
| `IMAGE_HOSTS` | no | Extra hosts whose images the server resizes to WebP at `/_img` (an R2 or CDN host). The `STRAPI_PUBLIC_URL` host and `images.unsplash.com` are always allowed; the internal `STRAPI_URL` host is not (it would reach the browser). |
| `PAGE_CACHE_TTL_MS` | no | Seconds-scale cache of rendered public pages, in ms (default `10000`, `0` turns it off). Booking and payment pages are never cached. A CMS change shows up within `STRAPI_CACHE_TTL_MS` + this value (about 40 s). |
| (uses `FORMS_PROXY_SECRET`) | no | The draft preview opened from the CMS "Vista previa" button has no secret of its own: it is signed with `FORMS_PROXY_SECRET`, the same value in the CMS and the web. `?preview=<exp>.<sig>` (`exp` = unix seconds, `sig` = hex HMAC-SHA256 of `<exp>:<pathname>`) makes that one request read `status=draft` from Strapi, skip every cache, answer `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow` and show a "Vista previa (borrador)" bar. Expired, foreign-path or invalid tokens are ignored (the normal page is served). Without `FORMS_PROXY_SECRET` the preview is off. |
| `STRAPI_API_TOKEN`, `STRAPI_FORMS_TOKEN` | optional | Only if you remove the Public role permissions in Strapi. |
| `STRAPI_CACHE_TTL_MS`, `STRAPI_TIMEOUT_MS` | optional | Server-side cache (default 30000) and request timeout (default 5000). |
| `PORT` | optional | Default 4000. |

## When content changes show up

Every route is rendered per request and reads Strapi through a server-side cache (`STRAPI_CACHE_TTL_MS`, 30 s by default). A change published in Strapi (copy, theme, navigation, booking numbers, media, tours) is live within that window: no rebuild and no webhook. The build does not need the CMS. If Strapi is unreachable the last good response is served, and the bundled static catalog if there is none.

## Content Security Policy

Rendered pages carry an enforced `Content-Security-Policy` plus a `Content-Security-Policy-Report-Only` copy, both built in `src/security-headers.ts`. Inline scripts are allowed by hash, computed from each page, plus the hash of Angular's `onload="this.media='all'"` stylesheet handler (`'unsafe-hashes'`). Every other response keeps `frame-ancestors 'none'`.

- **Enforced with an exact host list**: `script-src`, `style-src`, `font-src`, `media-src`, `object-src`, `base-uri`, `frame-ancestors`. Allowed script hosts: Google Tag Manager/Analytics (`*.googletagmanager.com`, plus `tagmanager.google.com` for GTM preview), Meta (`connect.facebook.net`), Cloudflare Turnstile, Stripe, Culqi and the device-profiling hosts Culqi 3DS injects (`*.online-metrix.net`, `m.vnforapps.com`). No `'unsafe-inline'` or `'unsafe-eval'` for scripts.
- **Still open to any `https:` host in the enforced policy**: `img-src`, `connect-src`, `frame-src`, `form-action`. Culqi 3-D Secure posts to and frames hosts chosen at run time (Cardinal, the card issuer), and the payment step is reached by an in-app navigation, so it cannot get a policy of its own. The report-only copy has the exact list for these four: on staging, pay with Culqi 3DS and Stripe test cards with the console open, add every host reported as `[Report Only]` to `src/security-headers.ts`, and then drop `https:` from the `open` set.
- **GTM container rules** (the policy blocks them otherwise): no Custom HTML tags and no Custom JavaScript variables (they need `'unsafe-inline'` / `'unsafe-eval'`); use gallery templates instead (GA4 Google tag, the Meta Pixel template). A tag that loads a new host (Google Ads, TikTok, Hotjar…) needs that host in `src/security-headers.ts` first.
- `style-src` keeps `'unsafe-inline'` because Angular inlines component styles; dropping it needs a CSP nonce (`CSP_NONCE`) and is a separate change.

## Full stack locally

`docker-compose.yml` runs the site, the CMS (built from `../desertica-cms`) and Postgres:

```bash
git clone https://github.com/Desertica/desertica-cms.git ../desertica-cms
cp .env.example .env   # add the CMS secrets and DATABASE_PASSWORD (see the compose file)
docker compose up --build
```

Compose passes `TRUST_PROXY` through and defaults it to `0` (nothing in front of the site). Behind Traefik or Cloudflare set it to the number of proxies, otherwise every visitor shares one IP and the form and image rate limits hit everyone. In production (`NODE_ENV=production`) the server refuses to start without a numeric `TRUST_PROXY` (`0` means nothing in front).

## Checklist

1. Deploy the CMS, create the admin user, edit `Site — Settings`, upload media.
2. Deploy the site with `NG_ALLOWED_HOSTS`, `STRAPI_URL`, `STRAPI_PUBLIC_URL` and the shared `FORMS_PROXY_SECRET`.
3. Terminate TLS in front of both apps and set `TRUST_PROXY=1` (`2` with Cloudflare in front).

## Recommended platform: Railway + Cloudflare

For real-environment testing (staging) and a small first production. Railway deploys each private GitHub repo straight from its `Dockerfile` (the same one CI builds, no registry credentials), provisions Postgres in one click, gives services a private network, volumes, TLS domains and separate environments (staging from `develop`, production from `main`) with an option to wait for CI. Cost is usage-based: check current pricing. Put Cloudflare in front for DNS and CDN, and use R2 for media (S3-compatible). Fly.io (region `gru`, São Paulo) or AWS (ECS + RDS + S3) are the alternatives; the containers and variables are the same.

### Site service

1. Add a service from `Desertica/desertica-web` (branch `main` for production, `develop` for staging) after the CMS service from `desertica-cms` exists (see its `docs/DEPLOY.md`).
2. Variables:
   - `NG_ALLOWED_HOSTS=tudominio.com,www.tudominio.com`. The healthcheck uses `/healthz`, which answers before the host check, so its `Host` does not need to be listed.
   - `STRAPI_URL=http://<cms service>.railway.internal:1337` (private network) and `STRAPI_PUBLIC_URL=https://cms.tudominio.com`.
   - `FORMS_PROXY_SECRET` (same value as the CMS) and `TRUST_PROXY=1` (`2` with Cloudflare in front).
3. Service settings: healthcheck path `/healthz`, port from `PORT` (4000 by default), domain `tudominio.com`, then the Cloudflare record with proxy on.
4. Cloudflare cache rules: cache `/fonts/*` and the hashed JS/CSS; leave HTML uncached (it is rendered per request).
5. Staging: duplicate the environment, point it at `develop` and give it its own database, secrets and domain.

### What is verified

The image, `NG_ALLOWED_HOSTS` behaviour, the compose stack with Postgres and the CI and image workflows are tested. The Railway settings above come from its documentation and have **not been tried on a real account**.
