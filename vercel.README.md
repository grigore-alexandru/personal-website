# `vercel.json`

Replaces `netlify.toml`. Four settings, each load-bearing:

### `regions: ["fra1"]`
Serverless functions run in Frankfurt. The Vercel default is `iad1`
(Washington D.C.), and Supabase for this project lives in `eu-central-1`
(Frankfurt). On the default region every SSR render, every `generateMetadata`,
every sitemap rebuild and every `/r/[slug]` click would cross the Atlantic
twice — roughly +200ms per database round trip, and `/r/[slug]` makes one on
the hot path of a human click. One region is all the Hobby plan allows, and
this is the right one.

### `git.deploymentEnabled`
The two archived migration branches never build. `main` and `dev` are absent
from this map and therefore **do** build — `main` to production, `dev` to a
preview URL. This is the deliberate change from Netlify, where the
`ignore = "[ \"$CONTEXT\" != \"production\" ]"` line killed every non-production
build to protect a 300-minute monthly allowance that ran out mid-incident on
2026-09-04. Vercel Hobby does not meter builds that way, so `dev` now earns a
preview URL to check before merging — a safety net this project never had.

### `functions."src/app/og/route.ts".maxDuration`
The og:image transformer fetches a remote image and re-encodes it with sharp.
The Hobby default is 10s; a cold start plus a slow Mega S4 fetch plus a large
source can exceed that, and a timeout there means a blank social card. 20s is
still well inside the Hobby ceiling of 60s.

### What is deliberately NOT here
- **No `redirects`.** They stay in `next.config.js`, where Next applies them
  during `next build`. Duplicating them here would create two sources of truth.
- **No `images`.** `next.config.js` `images.remotePatterns` is what Next's own
  optimizer reads on Vercel. The `vercel.json` `images` key is for the Build
  Output API and is ignored for a Next.js project.
- **No `headers`.** Vercel sets HSTS on custom domains once the certificate is
  issued, which is what Netlify was doing.
