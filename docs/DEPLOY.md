# Deploying the site

The site is a Node server (Angular SSR + the forms proxy) that reads content from Strapi. Deploy the CMS first: see `docs/DEPLOY.md` in `Desertica/desertica-cms`.

## Image

`Dockerfile` builds a multi-stage image (Node 22, non-root, healthcheck). CI publishes `ghcr.io/desertica/desertica-web` (`latest` from `main`, `sha-<short>`, semver tags) from `.github/workflows/docker.yml`. Locally:

```bash
docker build -t desertica-web .
docker run -p 4000:4000 -e NG_ALLOWED_HOSTS=localhost desertica-web
```

## Runtime configuration (environment)

| Variable | Required | Meaning |
| --- | --- | --- |
| `NG_ALLOWED_HOSTS` | yes | Comma-separated hostnames the server answers to (e.g. `desertica.pe,www.desertica.pe`). Any other `Host` gets 400 (SSRF protection). Defaults only cover `localhost`. |
| `STRAPI_URL` | to use the CMS | URL the server uses to reach Strapi (private network URL is fine). Empty = bundled static catalog. |
| `STRAPI_PUBLIC_URL` | if media is served by Strapi | URL browsers use to load uploaded media. Defaults to `STRAPI_URL`. |
| `FORMS_PROXY_SECRET` | recommended | Same value as in the CMS. Lets the CMS rate-limit by visitor IP instead of the proxy's. |
| `TRUST_PROXY` | behind a proxy | `true` when a reverse proxy sets `X-Forwarded-For`, so rate limits see the visitor IP. |
| `STRAPI_API_TOKEN`, `STRAPI_FORMS_TOKEN` | optional | Only if you remove the Public role permissions in Strapi. |
| `STRAPI_CACHE_TTL_MS`, `STRAPI_TIMEOUT_MS` | optional | Server-side cache (default 30000) and request timeout (default 5000). |
| `PORT` | optional | Default 4000. |

## When content changes show up

Every route is rendered per request and reads Strapi through a server-side cache (`STRAPI_CACHE_TTL_MS`, 30 s by default). A change published in Strapi (copy, theme, navigation, booking numbers, media, tours) is live within that window: no rebuild and no webhook. The build does not need the CMS. If Strapi is unreachable the last good response is served, and the bundled static catalog if there is none.

## Full stack locally

`docker-compose.yml` runs the site, the CMS (built from `../desertica-cms`) and Postgres:

```bash
git clone https://github.com/Desertica/desertica-cms.git ../desertica-cms
cp .env.example .env   # add the CMS secrets and DATABASE_PASSWORD (see the compose file)
docker compose up --build
```

## Checklist

1. Deploy the CMS, create the admin user, edit `Site — Settings`, upload media.
2. Deploy the site with `NG_ALLOWED_HOSTS`, `STRAPI_URL`, `STRAPI_PUBLIC_URL` and the shared `FORMS_PROXY_SECRET`.
3. Terminate TLS in front of both apps and set `TRUST_PROXY=true`.

## Recommended platform: Railway + Cloudflare

For real-environment testing (staging) and a small first production. Railway deploys each private GitHub repo straight from its `Dockerfile` (the same one CI builds, no registry credentials), provisions Postgres in one click, gives services a private network, volumes, TLS domains and separate environments (staging from `develop`, production from `main`) with an option to wait for CI. Cost is usage-based: check current pricing. Put Cloudflare in front for DNS and CDN, and use R2 for media (S3-compatible). Fly.io (region `gru`, São Paulo) or AWS (ECS + RDS + S3) are the alternatives; the containers and variables are the same.

### Site service

1. Add a service from `Desertica/desertica-web` (branch `main` for production, `develop` for staging) after the CMS service from `desertica-cms` exists (see its `docs/DEPLOY.md`).
2. Variables:
   - `NG_ALLOWED_HOSTS=tudominio.com,www.tudominio.com,healthcheck.railway.app`. The healthcheck must be allowed or it gets 400 and the deploy never turns healthy (confirm the healthcheck host in Railway's docs if it still fails).
   - `STRAPI_URL=http://<cms service>.railway.internal:1337` (private network) and `STRAPI_PUBLIC_URL=https://cms.tudominio.com`.
   - `FORMS_PROXY_SECRET` (same value as the CMS) and `TRUST_PROXY=true`.
3. Service settings: healthcheck path `/`, port from `PORT` (4000 by default), domain `tudominio.com`, then the Cloudflare record with proxy on.
4. Cloudflare cache rules: cache `/fonts/*` and the hashed JS/CSS; leave HTML uncached (it is rendered per request).
5. Staging: duplicate the environment, point it at `develop` and give it its own database, secrets and domain.

### What is verified

The image, `NG_ALLOWED_HOSTS` behaviour, the compose stack with Postgres and the CI and image workflows are tested. The Railway settings above come from its documentation and have **not been tried on a real account**.
