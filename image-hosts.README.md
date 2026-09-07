# `image-hosts.json`

The single list of remote hosts this site is allowed to fetch images from.

It used to live in **three** places that had to be kept in sync by hand:

- `images.remotePatterns` in `next.config.js` — for `next/image`;
- `[images] remote_images` in `netlify.toml` — for the Netlify Image CDN, which
  `ogImage()` used to build social cards;
- an ad-hoc regex in `scripts/check-metadata.mjs`, which parsed the TOML.

A host missing from any one of them produced a different, silent failure: a
broken `next/image`, a 400 from the image transform, or a green build that had
never actually checked the host. Netlify is gone and `ogImage()` now points at
`/api/og`, so this file is the one place a new host gets added.

Consumed by:

| Consumer | How |
|---|---|
| `next.config.js` | `require()` → `images.remotePatterns` |
| `src/app/api/og/route.ts` | `import` → SSRF allowlist for the OG transformer |
| `scripts/check-metadata.mjs` | `readFileSync` → post-build assertion |

Add a host here and all three pick it up. Nowhere else needs to change.
