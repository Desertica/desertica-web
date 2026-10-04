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

- Routes rendered per request (`/blog`, `/products`, tours created after the build) reflect Strapi within `STRAPI_CACHE_TTL_MS`. Settings such as theme, navigation, copy and booking numbers also reach those pages that fast.
- Prerendered pages (home, tours list, tour pages that existed at build time, About, Contact, legal pages and hubs) bake CMS content in at build time. Pass `STRAPI_URL` as a build argument (`--build-arg STRAPI_URL=...`, or the `STRAPI_URL` repository variable in CI) and rebuild after publishing: add a Strapi webhook on `entry.publish`/`entry.unpublish` that triggers the image build and redeploy.

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
3. Add the webhook so publishing triggers a rebuild.
4. Terminate TLS in front of both apps and set `TRUST_PROXY=true`.
