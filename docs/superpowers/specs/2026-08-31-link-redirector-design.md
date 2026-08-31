# Link Redirector & Interstitial System — Design

Date: 2026-08-31
Status: Approved

## 1. Purpose

An admin-managed short-link system on the personal site. Each link lives at
`alexandrugrigore.com/r/<slug>`, is printed on business cards / encoded into QR
codes, and forwards visitors to a destination URL that can be changed later
without reprinting anything. Each link may optionally show a self-contained
HTML/CSS/JS "interstitial" animation before forwarding.

Secondary goal: remove the orphaned media-compressor admin feature.

## 2. Decisions taken (and why)

| Decision | Choice | Reason |
|---|---|---|
| Anonymous click writes | `SECURITY DEFINER` RPC | Tables stay admin-only; no service-role secret; atomic increment |
| Visitor identity | Salted daily SHA-256 hash | Unique-clicks works; no raw IP persisted (GDPR) |
| QR generation | `qrcode` npm package | Emits both SVG and canvas/PNG with custom colours + transparency |
| Shared UI | Extract primitives, migrate existing admin cards onto them | Single source of truth for toggle/kebab/modal patterns |
| URL prefix | `/r/<slug>` | Namespaced; cannot ever collide with a future top-level page |
| Delete | Hard delete, cascading | Matches spec; keeps DB clean |

## 3. Data model

Migration: `supabase/migrations/<ts>_create_links_tables.sql`

### 3.1 `links`

```
id                             uuid pk default gen_random_uuid()
name                           text not null
slug                           text not null unique
destination_url                text not null
description                    text
status                         text not null default 'active'
                               check (status in ('active','paused','archived'))
expires_at                     timestamptz
max_clicks                     integer
click_count                    integer not null default 0
interstitial_enabled           boolean not null default false
interstitial_code              text
interstitial_fallback_seconds  integer not null default 8
created_at                     timestamptz not null default now()
updated_at                     timestamptz not null default now()
```

Additional DB-level guards, matching the conventions established in
`20260315111131_20260315_rls_hardening_and_url_constraints.sql`:

- `links_slug_format` — `slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'` and `length(slug) between 3 and 64`
- `links_destination_no_js` — `destination_url NOT ILIKE 'javascript:%'`
- `links_max_clicks_positive` — `max_clicks is null or max_clicks > 0`
- `links_fallback_bounds` — `interstitial_fallback_seconds between 1 and 30`
- index on `(status, expires_at)` for the admin list

`slug` is immutable at the application layer: no UI control edits it after creation.

### 3.2 `link_destination_history`

```
id                   uuid pk default gen_random_uuid()
link_id              uuid not null references links(id) on delete cascade
old_destination_url  text not null
changed_at           timestamptz not null default now()
```

Index on `(link_id, changed_at desc)`. Populated by a `before update` trigger on
`links` which also refreshes `updated_at`. Append-only; nothing in the app writes
to it directly.

### 3.3 `link_clicks`

```
id             uuid pk default gen_random_uuid()
link_id        uuid not null references links(id) on delete cascade
clicked_at     timestamptz not null default now()
referrer_domain text
device_type    text check (device_type in ('mobile','desktop','tablet'))
visitor_hash   text
```

Indexes on `(link_id, clicked_at desc)` and `(link_id, visitor_hash)`.

`visitor_hash` = `sha256(ip || user_agent || LINK_HASH_SALT || current_date)`,
computed in the Next.js route before the RPC call. The raw IP is never persisted
and the hash rotates daily, so it cannot be correlated across days. It exists
solely to compute "unique clicks".

Never rendered as a raw table in the UI — aggregates only.

### 3.4 RLS

All three tables: RLS enabled, and every policy (select/insert/update/delete)
requires `exists (select 1 from profiles where profiles.id = auth.uid() and
profiles.is_admin)`, consistent with `posts` / `projects` / `content`.

The public redirect never touches these tables directly.

### 3.5 `register_click(...)` — SECURITY DEFINER

```
register_click(
  p_slug          text,
  p_referrer      text,
  p_device        text,
  p_visitor_hash  text
) returns table (
  destination_url               text,
  interstitial_enabled          boolean,
  interstitial_code             text,
  interstitial_fallback_seconds integer
)
```

Behaviour, in one transaction:

1. Select the link by slug `for update`. Not found or `status = 'archived'` → return zero rows.
2. `status <> 'active'` → return zero rows.
3. `expires_at < now()` or `click_count + 1 > max_clicks` → set `status = 'paused'`, return zero rows.
4. Insert into `link_clicks`, `click_count = click_count + 1`.
5. Return the four redirect fields.

`security definer`, `set search_path = public, pg_temp`.
`revoke all on function ... from public; grant execute to anon, authenticated;`

The `for update` row lock is what makes the counter and the max-click cutoff
correct under concurrent scans — the read-then-write in the original sketch
could lose counts.

Note: the returned `destination_url` is what the outer page needs; the trigger on
`links` fires on the status flip in step 3 but not on click increments (it only
logs when `destination_url` changes).

### 3.6 `get_link_stats(p_link_id uuid) returns json` — SECURITY INVOKER

Runs under the caller's RLS (so: admin only). Returns one payload:

```json
{
  "total_clicks": 0,
  "unique_clicks": 0,
  "last_clicked_at": null,
  "daily": [{ "day": "2026-08-01", "clicks": 0 }],
  "devices": { "mobile": 0, "desktop": 0, "tablet": 0 },
  "referrers": [{ "referrer": "Direct / QR scan", "clicks": 0 }]
}
```

`daily` covers the last 30 days, zero-filled via `generate_series` so the chart
never has gaps. `unique_clicks` counts `distinct visitor_hash` (rows with a null
hash each count as one). Null/empty `referrer_domain` is bucketed as
`Direct / QR scan`.

## 4. Redirect route

`src/app/r/[slug]/page.tsx` — Server Component.

- `export const dynamic = 'force-dynamic'`. **A deliberate exception** to the
  project's no-`force-dynamic` rule: this is a per-visitor, side-effecting
  endpoint, not a content page. Caching it would break click counting and expiry.
- `generateMetadata` emits `robots: { index: false, follow: false }`.
- Excluded from `src/app/sitemap.ts`.

Flow:

1. Read `Referer`, `User-Agent`, `x-forwarded-for` via `headers()`.
2. Derive `referrer_domain` (hostname only, `null` when the header is absent or
   points at our own host), `device_type`, and `visitor_hash`.
3. Call `register_click` through an anon Supabase client.
4. Zero rows → render `LinkUnavailable`, a minimal standalone page (no site chrome).
5. Rows, interstitial off or code blank → `redirect(destination_url)` (307).
6. Rows, interstitial on → render `<InterstitialShell>`.

Device parsing: `/mobile|iphone|android.*mobile/i` → mobile,
`/ipad|tablet|android/i` → tablet, else desktop.

Middleware is untouched: its matcher is `/admin/:path*`, so `/r/*` is already public.

## 5. Interstitial runtime

`src/components/links/InterstitialShell.tsx` — Client Component. Props:
`code`, `destination`, `fallbackSeconds`.

- Renders `<iframe sandbox="allow-scripts" srcdoc={code}>`. **No
  `allow-same-origin`**: the code cannot read cookies, reach the parent DOM, or
  navigate the top-level page.
- The destination lives only in the outer page's closure. It is never injected
  into the iframe. Changing a destination therefore never requires touching
  interstitial code, and a buggy interstitial can only fail to signal — it can
  never redirect somewhere unintended.
- `message` listener requires **both** `event.source === iframeRef.current.contentWindow`
  and `event.data === 'interstitial:ready'`.
- A `setTimeout(fallbackSeconds * 1000)` races the message. First one wins; a
  `hasNavigated` ref guarantees exactly one navigation. Listener and timer are
  cleaned up on unmount.
- Navigation is `window.location.replace(destination)` so Back does not bounce
  the visitor into the animation again.
- `<noscript><meta http-equiv="refresh" content="0;url=..."></noscript>` so a
  JS-disabled visitor still reaches the destination.

Handoff contract, documented in the editor UI: the interstitial calls
`parent.postMessage('interstitial:ready', '*')` when it is done.

## 6. Admin data layer

`src/utils/linksService.ts`, mirroring `contentService.ts` — client-side Supabase
calls from Client Components, exactly how every other admin page in this codebase
works.

```
listLinks()                       -> Link[]
createLink(input)                 -> Link
updateLink(id, patch)             -> Link
deleteLink(id)                    -> void
checkLinkSlugUniqueness(slug)     -> boolean
loadDestinationHistory(linkId)    -> DestinationHistoryEntry[]
loadLinkStats(linkId)             -> LinkStats
```

Types: `src/types/links.ts` (`Link`, `LinkStatus`, `LinkStats`,
`DestinationHistoryEntry`, `LinkFormErrors`), plus the three tables added to
`src/types/database.ts`.

Validation: `src/utils/validateLinkForm.ts`, reusing the existing `slugify` and
`validateSlug` helpers.

## 7. Validation rules

| Field | Rule |
|---|---|
| name | required, 1–80 chars |
| slug | required, 3–64, `^[a-z0-9]+(-[a-z0-9]+)*$`, unique (debounced check + unique constraint) |
| destination_url | required, parses as a URL with `http:`/`https:` protocol |
| description | optional, ≤ 200 chars |
| expires_at | optional; must be in the future when set |
| max_clicks | optional; positive integer |
| interstitial_code | required (non-whitespace) when `interstitial_enabled` is true — blocked, not a silent no-op |
| interstitial_fallback_seconds | integer 1–30, default 8 |

Errors are inline and field-level. A card with invalid or incomplete required
fields cannot be collapsed or saved; the offending fields are flagged.

## 8. Admin UI

### 8.1 Shared primitives (new, `src/components/ui/`)

`Modal`, `ConfirmDialog`, `ToggleSwitch`, `KebabMenu`, `SplitButton`.

Each is built by lifting the *exact* markup and Tailwind classes already in
`AdminBlogCard` and the inline delete modal in `src/app/admin/blog/page.tsx`, so
that migrating the existing cards onto them is byte-identical output. `Modal`
provides the shared conventions: X button in the top-right corner, backdrop
click, ESC to close, body scroll lock, focus trap.

Then migrate `AdminBlogCard`, `AdminProjectCard`, `AdminContentCard` and the
inline delete/publish modals onto them. Verified visually in the browser before
the step is considered done.

### 8.2 Links list — `src/app/admin/links/page.tsx`

Top bar: `SearchBar` (existing component) + sort control + "New Link" button.

New link: a card appears at the top, expanded, empty. **It is held in local state
until its first valid save** — no empty DB row is inserted. An abandoned creation
leaves nothing behind and squats no slug. Name drives the slug suggestion, with a
regenerate-as-random-token control beside it.

Collapsed card:
- Full short link, read-only, copy-to-clipboard button
- Destination URL — inline editable, autosaves on blur
- Description — read-only, clamped to one line
- Toggle in the top corner — active/paused, also the way to re-enable a link that
  auto-paused on expiry or click limit
- Click count
- Kebab menu: Stats · Generate QR · Delete (red, trash icon, confirm dialog)
- Expand control at the bottom

Expanded section (inline, autosave on blur):
- Description (editable)
- Expiration date picker (`<input type="date">`)
- Max-click limit
- Interstitial toggle (off by default) + "Edit animation" button
- Destination-change history
- Stats link

Autosave semantics: local dirty state per field → blur → validate → patch →
optimistic update, error toast + revert on failure.

### 8.3 Interstitial editor modal

Left column: code textarea · "Paste code" (Clipboard API) · debounced status
strip (green "Loads fine" / red "Error: …", from loading the code into a hidden
sandboxed iframe and catching thrown errors) · fallback-timeout input.
Right column: live sandboxed preview + fullscreen expand.
Bottom: Cancel / Save.

Exit: X or Cancel with unsaved changes → confirm dialog (Save / Discard / Keep
editing). Save closes without prompting.

### 8.4 QR modal

Live preview from the short-link URL. Transparent/solid background toggle +
background colour picker (native `<input type="color">`) + QR foreground colour
picker. `SplitButton` exporting: Download PNG · Download SVG · Copy as PNG ·
Copy as SVG. No logo overlays.

### 8.5 Stats modal

Aggregates only, from `get_link_stats`: total clicks · unique clicks · last
clicked · 30-day bar chart · device split percentages · top referrers with a
`Direct / QR scan` bucket.

## 9. Compressor removal

1. Delete `src/components/admin/MediaCompressor.tsx` (zero importers).
2. Remove the `Compressor` entry from `AdminHeader` nav, replaced by `Links`.
3. Remove the now-dead `/admin/compressor` COOP/COEP header block from `next.config.js`.

`@ffmpeg/*` stays in `package.json` — it is still used by the content video
pipeline.

## 10. Out of scope

Thumbnails / destination screenshots / image uploads · raw per-click log in the
UI · interstitial version history · manual "test run" button · multi-source
tagging for one destination.

## 11. Environment

One new server-only variable: `LINK_HASH_SALT` (any long random string), needed
in `.env` and in Netlify. Absent, the visitor hash falls back to null and unique
clicks degrade to total clicks rather than breaking the redirect.
