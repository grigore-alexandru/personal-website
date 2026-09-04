#!/usr/bin/env node
/**
 * Verifies the deployed site serves real pages to social crawlers.
 *
 *     node scripts/check-crawler-access.mjs [origin]
 *
 * Why this exists: on 2026-09-01 the "Netlify Prerender" extension began
 * returning HTTP 404 to every crawler user agent while browsers got 200 on the
 * same URL. Blank WhatsApp previews were the only visible symptom, and no
 * amount of checking the HTML in a browser — or with an OG validator, whose UA
 * was not intercepted — could reveal it. Only requesting the page *as a
 * crawler* shows the problem.
 *
 * `check-metadata.mjs` inspects build output; this inspects the live edge.
 * Both are needed: correct HTML that crawlers cannot reach is still broken.
 */

const ORIGIN = (process.argv[2] ?? 'https://alexandrugrigore.com').replace(/\/$/, '');

const PATHS = [
  '/',
  '/blog',
  '/blog/am-fost-un-om-mult-prea-crud',
  '/portfolio/projects',
  '/documents/visual-presentation',
];

const AGENTS = {
  'facebookexternalhit': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'WhatsApp': 'WhatsApp/2.23.20.0 A',
  'Twitterbot': 'Twitterbot/1.0',
  'Googlebot': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'browser': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
};

const REQUIRED_TAGS = ['og:title', 'og:image', 'og:site_name', 'og:locale', 'application/ld+json'];

const failures = [];

for (const path of PATHS) {
  for (const [label, ua] of Object.entries(AGENTS)) {
    let res;
    try {
      res = await fetch(`${ORIGIN}${path}`, {
        headers: { 'user-agent': ua, accept: 'text/html' },
        redirect: 'follow',
      });
    } catch (err) {
      failures.push(`${path} [${label}] request failed: ${err.message}`);
      continue;
    }

    if (!res.ok) {
      failures.push(`${path} [${label}] HTTP ${res.status} (browsers may still get 200 — that is the bug)`);
      continue;
    }

    const html = await res.text();
    const missing = REQUIRED_TAGS.filter((tag) => !html.includes(tag));
    if (missing.length) failures.push(`${path} [${label}] missing: ${missing.join(', ')}`);

    process.stdout.write('.');
  }
}

process.stdout.write('\n');

if (failures.length) {
  console.error(`\n✗ ${failures.length} crawler problem(s) on ${ORIGIN}:\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`✓ all ${PATHS.length} paths serve complete metadata to every crawler on ${ORIGIN}`);
