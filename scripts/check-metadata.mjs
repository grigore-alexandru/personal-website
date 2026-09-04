#!/usr/bin/env node
/**
 * Post-build guard for the metadata regressions that are invisible in review.
 *
 * Run after `next build`:
 *     node scripts/check-metadata.mjs
 *
 * Every check here corresponds to a defect that shipped to production and went
 * unnoticed for months, because all of them produce perfectly valid-looking
 * HTML:
 *
 *   1. og:site_name missing — a page-level `openGraph` object REPLACES the root
 *      layout's rather than merging into it, so hand-writing one silently drops
 *      siteName and locale. Build metadata through src/lib/seo.ts.
 *   2. JSON-LD in a <meta> tag — `metadata.other['script:ld+json']` renders
 *      <meta name="script:ld+json">, which no search engine reads. Use the
 *      <JsonLd> component.
 *   3. og:image pointing at a local path with no file behind it — /og-default.jpg
 *      was referenced by seven routes and never existed.
 *   4. Remote og:image hosts missing from netlify.toml's `remote_images`, which
 *      makes the Netlify Image CDN transform 400 instead of falling back.
 *   5. Titles over 60 characters and descriptions over 200, both of which get
 *      truncated mid-thought on every platform.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP_DIR = '.next/server/app';
const PUBLIC_DIR = 'public';

if (!existsSync(APP_DIR)) {
  console.error(`✗ ${APP_DIR} not found — run \`npm run build\` first.`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.html') ? [full] : [];
  });
}

const allowedHosts = (() => {
  const toml = readFileSync('netlify.toml', 'utf8');
  const block = /remote_images\s*=\s*\[([\s\S]*?)\]/.exec(toml)?.[1] ?? '';
  return [...block.matchAll(/"https:\/\/([^/"]+)/g)].map((m) => m[1].replace(/\\/g, ''));
})();

// React escapes apostrophes as &#x27;, so a naive named-entity-only decoder
// counts 6 characters where the reader sees 1 and reports false failures.
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const decode = (s) =>
  s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, ref) => {
    if (ref[0] !== '#') return NAMED[ref] ?? match;
    const hex = ref[1] === 'x' || ref[1] === 'X';
    const code = parseInt(hex ? ref.slice(2) : ref.slice(1), hex ? 16 : 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff
      ? String.fromCodePoint(code)
      : match;
  });

const failures = [];
const files = walk(APP_DIR);

for (const file of files) {
  const page = relative(APP_DIR, file);
  const html = readFileSync(file, 'utf8');
  const fail = (msg) => failures.push(`${page}: ${msg}`);

  if (!html.includes('og:site_name')) fail('missing og:site_name');
  if (!html.includes('og:locale')) fail('missing og:locale');
  if (!html.includes('application/ld+json')) fail('no JSON-LD <script>');
  if (html.includes('name="script:ld+json"')) fail('JSON-LD emitted as a <meta> tag');

  const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1];
  if (title && decode(title).length > 60) fail(`title is ${decode(title).length} chars (max 60)`);

  const desc = /property="og:description" content="([^"]*)"/.exec(html)?.[1];
  if (desc) {
    if (/[\r\n]/.test(desc)) fail('og:description contains a raw newline');
    if (decode(desc).length > 200) fail(`og:description is ${decode(desc).length} chars (max 200)`);
  }

  for (const m of html.matchAll(/property="og:image" content="([^"]*)"/g)) {
    const url = decode(m[1]);

    if (!/^https?:\/\//.test(url)) {
      fail(`og:image is not absolute: ${url}`);
      continue;
    }

    const { pathname, searchParams, host } = new URL(url);

    // A local asset must actually exist in public/.
    if (host === 'alexandrugrigore.com' && !pathname.startsWith('/.netlify/')) {
      if (!existsSync(join(PUBLIC_DIR, pathname))) fail(`og:image 404 — no public${pathname}`);
    }

    // A Netlify transform must name a host the CDN is allowed to fetch.
    if (pathname === '/.netlify/images') {
      const source = searchParams.get('url');
      const sourceHost = source ? new URL(source).host : null;
      if (sourceHost && !allowedHosts.includes(sourceHost)) {
        fail(`og:image source host not in netlify.toml remote_images: ${sourceHost}`);
      }
    }
  }
}

console.log(`checked ${files.length} prerendered pages against ${allowedHosts.length} allowed image hosts`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} metadata problem(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log('✓ metadata checks passed');
