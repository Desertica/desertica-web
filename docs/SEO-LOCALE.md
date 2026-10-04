# Language in the URL: decision

## Where we are

The language is chosen by the `locale` cookie (falling back to `localStorage`, then English). The same URL
therefore returns English or Spanish depending on who asks. Search engines send no cookie, so they only ever
see English, and a shared link shows the language of whoever opens it.

## Options

| Option | SEO | Cost and risk |
| --- | --- | --- |
| **A. Cookie only** (before) | Spanish is invisible to crawlers; no `hreflang` possible. | None, but it throws away Spanish search traffic. |
| **B. `?lang=es` on the same path** (implemented) | One crawlable URL per language, `hreflang` and canonical point at them, sitemap lists both. Google accepts query-parameter locale URLs, but treats them as weaker than paths. | Small: the server honours `?lang=` before the cookie; nothing else moves. |
| **C. Path prefix** (`/en/tours`, `/es/tours`) | Best: clean URLs, easy to cache at the CDN, obvious in analytics and Search Console. | Medium to high: see below. |
| D. Subdomain (`es.desertica.pe`) | Good, but two origins to configure for cookies, TLS, GTM and CORS. | High for a small team. |

## Decision

**B now, C when the booking engine goes live.** Moving to a prefix touches the router base, every
`routerLink`/`href` (including the paths the CMS stores for navigation), the locale switcher (it must navigate
instead of flipping a signal), hydration (the base must match the server), the Express redirects for old
unprefixed URLs (301 to the default language, which would reset any ranking gathered so far), and the
`/api/*` and asset routes that must stay unprefixed. Doing that in the same release as tracking, checkout and the
complaints book would mix a risky routing change with features that need to be verifiable on their own, so it
was not done here.

### What option B does

- English is the clean URL (`/tours`), every other language adds `?lang=xx` (`/tours?lang=es`).
- `?lang=` **wins over the cookie** (`resolveLocale`), so a link returned by Google opens in its language even for a
  visitor whose cookie says otherwise. The server rewrites the cookie to match, and the in-app language switcher
  updates `?lang=` when it is present, so a reload does not undo a manual switch.
- Every page emits `<link rel="canonical">` for its own language and `hreflang` alternates for `en`, `es` and
  `x-default` (English), plus `og:url`/`og:locale` (`SeoService`, `src/app/core/seo/seo.ts`).
- `sitemap.xml` lists each URL once per language, each entry with its full alternate set.
- HTML is `Cache-Control: private, no-cache` with `Vary: Cookie`: the page depends on a cookie, and a shared cache
  that ignores `Vary` (Cloudflare's default) would serve one language to everybody.

### How to move to option C later

1. Express: strip a leading `/en` or `/es` (`req.url`), remember it as the request locale, and answer unprefixed
   page URLs with a 301 to the prefixed one (language from cookie, then `Accept-Language`). Leave `/api`,
   `/sitemap.xml`, `/robots.txt` and static files unprefixed.
2. Angular: provide `APP_BASE_HREF` per request (`/en/` or `/es/`) from `REQUEST` on the server and from
   `location.pathname` in the browser, so `routerLink="/tours"` renders `/es/tours` with no template changes.
3. `I18nService`: the locale comes from the prefix; the switcher navigates to the same path under the other
   prefix. Drop the cookie as a source of truth (keep it only to pick the redirect target).
4. `localizedUrl()` and the sitemap builder change in one place each; `hreflang` stays correct.
5. With the language in the path the HTML no longer varies by cookie, so it can be cached at the CDN
   (`s-maxage`), which is the main operational win.
6. Ship it before the site has meaningful ranking on the `?lang=` URLs, and 301 those to the prefixed ones.
