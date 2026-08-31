# Link Redirector & Interstitial System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an admin-managed short-link system at `/r/<slug>` with optional sandboxed interstitial animations, QR export, and aggregated per-link stats — and remove the orphaned media compressor.

**Architecture:** Three new Supabase tables locked behind admin-only RLS, with a single `SECURITY DEFINER` RPC as the sole anonymous entry point for click registration. The public route is a `force-dynamic` Server Component that either 307-redirects or renders a Client Component hosting the interstitial in a `sandbox="allow-scripts"` iframe. The admin surface is a Client Component page following the existing `admin/blog` pattern, built on five newly extracted shared UI primitives.

**Tech Stack:** Next.js 14 App Router · Supabase (`@supabase/ssr`) · Tailwind + design tokens · lucide-react · `qrcode` (new dep)

**Reference spec:** `docs/superpowers/specs/2026-08-31-link-redirector-design.md`

## Global Constraints

- Server Components are the default. `"use client"` ONLY for interactivity (`framer-motion`, forms, iframes, clipboard).
- `force-dynamic` is FORBIDDEN everywhere except `src/app/r/[slug]/page.tsx`, where it is required and must carry an explanatory comment.
- Public env vars are `NEXT_PUBLIC_*`; server-only secrets carry NO prefix.
- All UI must reuse existing components (`Button`, `FormInput`, `FormTextarea`, `SearchBar`, `Toast`, `ValidationError`, `Tooltip`, `CustomDropdown`) and `designTokens` from `src/styles/tokens.ts` before anything new is written.
- Migrating existing admin cards onto new primitives must be **visually byte-identical** — lift exact markup and Tailwind classes, do not "improve" them.
- Slug regex, everywhere: `^[a-z0-9]+(-[a-z0-9]+)*$`, length 3–64.
- Handoff message string, exact: `interstitial:ready`
- Interstitial iframe attributes, exact: `sandbox="allow-scripts"` with `srcDoc` — never `allow-same-origin`.
- Every modal: X button top-right, ESC to close, backdrop click, body scroll lock.
- Commit after every task.

---

### Task 1: Database migration + generated types

**Files:**
- Create: `supabase/migrations/20260831120000_create_links_tables.sql`
- Modify: `src/types/database.ts` (append three table definitions)
- Create: `src/types/links.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: tables `links`, `link_destination_history`, `link_clicks`; functions `register_click(text,text,text,text)` and `get_link_stats(uuid)`; TS types `Link`, `LinkStatus`, `LinkStats`, `DestinationHistoryEntry`, `NewLinkInput`, `LinkPatch`.

- [ ] **Step 1: Read the existing RLS conventions**

Read `supabase/migrations/20260315111131_20260315_rls_hardening_and_url_constraints.sql`. Every new policy must use the same `profiles.is_admin` predicate shape.

- [ ] **Step 2: Write the migration**

Full SQL — tables with the CHECK constraints from spec §3.1, indexes, the destination-history trigger, admin-only RLS on all three tables, `register_click` as `SECURITY DEFINER` with `set search_path = public, pg_temp` and a `for update` row lock, `get_link_stats` as `SECURITY INVOKER` returning zero-filled 30-day buckets via `generate_series`. Grants: `revoke all on function register_click from public; grant execute on function register_click to anon, authenticated;` and `grant execute on function get_link_stats to authenticated;`

- [ ] **Step 3: Apply the migration**

Apply via the Supabase MCP `apply_migration` tool against the project. Then verify with `list_tables` that all three tables exist with RLS enabled.

- [ ] **Step 4: Sanity-check the RPC in SQL**

Insert one test link, call `register_click` with its slug, assert `click_count` became 1 and one `link_clicks` row exists. Call it for a nonexistent slug, assert zero rows. Delete the test link.

- [ ] **Step 5: Write the TypeScript types**

`src/types/links.ts` with `Link`, `LinkStatus = 'active' | 'paused' | 'archived'`, `LinkStats`, `DestinationHistoryEntry`, `NewLinkInput`, `LinkPatch`, `LinkFormErrors`. Append the three tables to the `Database` interface in `src/types/database.ts` following the existing shape.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add supabase/migrations src/types
git commit -m "feat(links): database schema, RPCs, and TypeScript types"
```

---

### Task 2: Public redirect route (instant-redirect path only)

**Files:**
- Create: `src/app/r/[slug]/page.tsx`
- Create: `src/app/r/[slug]/LinkUnavailable.tsx`
- Create: `src/utils/linkRequestContext.ts`
- Modify: `.env` (add `LINK_HASH_SALT`)

**Interfaces:**
- Consumes: `register_click` from Task 1.
- Produces: `parseRequestContext(headers): { referrerDomain, deviceType, visitorHash }` from `linkRequestContext.ts`; the route itself.

- [ ] **Step 1: Write `linkRequestContext.ts`**

Pure functions, no React: `referrerDomainFrom(referer, ownHost)` returning hostname or null (null for own host), `deviceTypeFrom(userAgent)` returning `'mobile' | 'tablet' | 'desktop'`, `visitorHashFrom(ip, userAgent, salt, date)` using `node:crypto` sha256. Exported individually plus a `parseRequestContext` wrapper.

- [ ] **Step 2: Write the route**

Server Component. `export const dynamic = 'force-dynamic'` with a comment stating why it is the sanctioned exception. `generateMetadata` returning `robots: { index: false, follow: false }`. Reads `headers()`, calls the RPC via an anon Supabase client, then: zero rows → `<LinkUnavailable />`; interstitial off or blank code → `redirect(destination_url)`.

- [ ] **Step 3: Write `LinkUnavailable`**

Minimal centered standalone page — no site chrome, no nav. Uses `designTokens` typography. Text: "This link isn't available." plus a muted line and a link home.

- [ ] **Step 4: Add the salt**

Append `LINK_HASH_SALT=<32 random hex chars>` to `.env`. Generate with `openssl rand -hex 32`.

- [ ] **Step 5: Verify in the browser**

Start the dev server via `preview_start`. Insert a test link row via SQL pointing at `https://example.com`. Navigate to `/r/<slug>` and confirm the 307 lands on example.com; navigate to `/r/does-not-exist` and confirm the unavailable page. Check `link_clicks` gained exactly one row with a non-null `visitor_hash`.

- [ ] **Step 6: Commit**

```bash
git add src/app/r src/utils/linkRequestContext.ts
git commit -m "feat(links): public /r/[slug] redirect route with click logging"
```

---

### Task 3: Interstitial runtime

**Files:**
- Create: `src/components/links/InterstitialShell.tsx`
- Modify: `src/app/r/[slug]/page.tsx` (wire the interstitial branch)

**Interfaces:**
- Consumes: the redirect route from Task 2.
- Produces: `<InterstitialShell code destination fallbackSeconds />`.

- [ ] **Step 1: Write `InterstitialShell`**

`"use client"`. Full-viewport iframe with `sandbox="allow-scripts"` and `srcDoc={code}`. A `hasNavigated` ref guards exactly one navigation. `message` listener validating `event.source === iframeRef.current?.contentWindow && event.data === 'interstitial:ready'`. `setTimeout` for `fallbackSeconds * 1000`. Both cleaned up in the effect teardown. Navigation via `window.location.replace(destination)`. A `<noscript><meta httpEquiv="refresh" content={`0;url=${destination}`} /></noscript>` fallback.

- [ ] **Step 2: Wire the route branch**

In `page.tsx`, when `interstitial_enabled && interstitial_code?.trim()`, render `<InterstitialShell />` instead of redirecting.

- [ ] **Step 3: Verify the ready signal**

Set a test link's `interstitial_code` via SQL to a page that posts `interstitial:ready` after 1.5s with a visible animation, `interstitial_fallback_seconds = 8`. Visit `/r/<slug>`; confirm the animation shows and the redirect fires at ~1.5s, not 8s.

- [ ] **Step 4: Verify the fallback timer**

Change the code to one that never posts a message and set fallback to 3. Confirm the redirect fires at ~3s.

- [ ] **Step 5: Verify the sandbox**

Set the code to one that attempts `parent.location = 'https://evil.example'` and `document.cookie`. Confirm the browser console shows the sandbox denial and the visitor still lands on the correct destination via the fallback.

- [ ] **Step 6: Commit**

```bash
git add src/components/links src/app/r
git commit -m "feat(links): sandboxed interstitial with postMessage handoff and fallback timer"
```

---

### Task 4: Shared UI primitives

**Files:**
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/ConfirmDialog.tsx`
- Create: `src/components/ui/ToggleSwitch.tsx`
- Create: `src/components/ui/KebabMenu.tsx`
- Create: `src/components/ui/SplitButton.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `<Modal open onClose title? size?='md'|'lg'|'xl'|'full' children footer? />`
  - `<ConfirmDialog open onCancel onConfirm title message confirmLabel? variant?='danger'|'primary' loading? />`
  - `<ToggleSwitch checked onChange disabled? loading? ariaLabel />`
  - `<KebabMenu items={{ label, icon?, onClick, variant?: 'default'|'danger' }[]} />`
  - `<SplitButton label onClick items={{ label, icon?, onClick }[]} loading? />`

- [ ] **Step 1: Read the source of truth**

Read `src/components/admin/AdminBlogCard.tsx` lines 100–170 (the toggle + kebab markup) and the delete-modal block in `src/app/admin/blog/page.tsx`. These exact class strings are what the primitives must reproduce.

- [ ] **Step 2: Write `ToggleSwitch` and `KebabMenu`**

Copy the class strings verbatim from AdminBlogCard — the `peer` checkbox pattern for the toggle, the fixed-inset backdrop + absolute dropdown for the kebab. Add `loading` (spinner replaces the switch, as AdminBlogCard already does) and a `danger` item variant using the existing `text-red-600 hover:bg-red-50`.

- [ ] **Step 3: Write `Modal`**

Backdrop `bg-black/40`, centered panel, X button at `absolute top-4 right-4`, ESC listener, backdrop click, `document.body.style.overflow` lock restored on unmount, focus moved to the panel on open.

- [ ] **Step 4: Write `ConfirmDialog` and `SplitButton`**

`ConfirmDialog` composes `Modal` and the existing `Button` (variant `danger` / `primary`). `SplitButton` is a primary action plus a chevron trigger opening a dropdown, reusing KebabMenu's dropdown positioning classes.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): extract Modal, ConfirmDialog, ToggleSwitch, KebabMenu, SplitButton primitives"
```

---

### Task 5: Migrate existing admin cards onto the primitives + remove the compressor

**Files:**
- Modify: `src/components/admin/AdminBlogCard.tsx`
- Modify: `src/components/admin/AdminProjectCard.tsx`
- Modify: `src/components/admin/AdminContentCard.tsx`
- Modify: `src/app/admin/blog/page.tsx` (inline delete + publish modals)
- Modify: `src/components/admin/AdminHeader.tsx` (nav: Compressor → Links)
- Modify: `next.config.js` (drop the `/admin/compressor` COOP/COEP block)
- Delete: `src/components/admin/MediaCompressor.tsx`

**Interfaces:**
- Consumes: the five primitives from Task 4.
- Produces: no new interfaces — a pure refactor plus the nav entry `{ label: 'Links', path: '/admin/links' }`.

- [ ] **Step 1: Screenshot the "before" state**

With the dev server running, screenshot `/admin/blog`, `/admin/portfolio`, `/admin/content`. These are the fidelity baseline.

- [ ] **Step 2: Migrate the three cards**

Replace the hand-rolled toggle and kebab blocks with `<ToggleSwitch />` and `<KebabMenu />`. Change nothing else — same wrappers, same spacing, same handlers.

- [ ] **Step 3: Migrate the blog page's inline modals**

Replace the delete-confirmation and publish-confirmation modal blocks with `<ConfirmDialog />`.

- [ ] **Step 4: Remove the compressor**

Delete `MediaCompressor.tsx`. In `AdminHeader`, replace the `Compressor` nav item with `{ label: 'Links', path: '/admin/links' }`. Delete the `headers()` block in `next.config.js` (keep `images` and `redirects`). Confirm `grep -rn "MediaCompressor\|admin/compressor" src next.config.js` returns nothing.

- [ ] **Step 5: Verify pixel fidelity**

Re-screenshot the same three pages and compare against Step 1. Any visual difference is a bug in the primitive, not an acceptable change. Exercise a toggle, a kebab menu, and a delete confirmation to confirm behaviour is unchanged.

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "refactor(admin): adopt shared primitives; remove orphaned media compressor"
```

---

### Task 6: Links service, validation, and the admin list page

**Files:**
- Create: `src/utils/linksService.ts`
- Create: `src/utils/validateLinkForm.ts`
- Create: `src/app/admin/links/page.tsx`
- Create: `src/app/admin/links/layout.tsx`
- Create: `src/components/links/LinkCard.tsx`
- Create: `src/components/links/LinkCardExpanded.tsx`

**Interfaces:**
- Consumes: types from Task 1, primitives from Task 4.
- Produces: `listLinks()`, `createLink(input: NewLinkInput)`, `updateLink(id, patch: LinkPatch)`, `deleteLink(id)`, `checkLinkSlugUniqueness(slug)`, `loadDestinationHistory(linkId)`, `loadLinkStats(linkId)`; `validateLinkField(field, value, link)` and `validateLinkForm(draft)` returning `LinkFormErrors`; `randomSlugToken()`.

- [ ] **Step 1: Write `linksService.ts`**

Mirror `src/utils/contentService.ts` exactly — client-side `supabase` import, snake_case↔camelCase mapping, thrown errors on failure. `loadLinkStats` calls the `get_link_stats` RPC.

- [ ] **Step 2: Write `validateLinkForm.ts`**

Implement the table in spec §7. Reuse `slugify` and `validateSlug`. `randomSlugToken()` returns 8 lowercase alphanumeric chars.

- [ ] **Step 3: Write `layout.tsx`**

Re-export `AdminSectionLayout` as default and declare `export const dynamic = 'force-dynamic'`, exactly as `src/app/admin/blog/layout.tsx` does.

- [ ] **Step 4: Write `LinkCard` (collapsed)**

Short link + copy button, inline-editable destination autosaving on blur, clamped description, `ToggleSwitch` top-right, click count, `KebabMenu` (Stats · Generate QR · Delete-in-red), expand control at the bottom. Card chrome copies `AdminBlogCard`'s container classes.

- [ ] **Step 5: Write `LinkCardExpanded`**

Description textarea, date input, max-clicks number input, interstitial toggle, "Edit animation" button, destination history list, stats link. All autosave on blur; field-level errors under each field; collapse blocked while errors exist.

- [ ] **Step 6: Write the list page**

`"use client"`, following `src/app/admin/blog/page.tsx`. `SearchBar` + sort dropdown + New Link button. New links live in local state until the first valid save. `useToast` for feedback, `ConfirmDialog` for delete.

- [ ] **Step 7: Verify in the browser**

Create a link, confirm the slug auto-suggests from the name and the token regenerator works. Save, confirm the row lands in Supabase. Edit the destination, blur, and confirm the history entry appears. Toggle paused, visit `/r/<slug>`, confirm the unavailable page.

- [ ] **Step 8: Commit**

```bash
git add src/utils/linksService.ts src/utils/validateLinkForm.ts src/app/admin/links src/components/links
git commit -m "feat(links): admin list page with expandable cards and inline autosave"
```

---

### Task 7: Interstitial editor modal

**Files:**
- Create: `src/components/links/InterstitialEditorModal.tsx`
- Create: `src/components/links/InterstitialPreview.tsx`
- Modify: `src/components/links/LinkCardExpanded.tsx` (open the modal)

**Interfaces:**
- Consumes: `Modal`, `ConfirmDialog`, `Button` from Task 4; `updateLink` from Task 6.
- Produces: `<InterstitialEditorModal open link onClose onSave />`; `<InterstitialPreview code onValidation? className />`.

- [ ] **Step 1: Write `InterstitialPreview`**

Sandboxed iframe rendering `srcDoc={code}`. When `onValidation` is passed, it injects a tiny error-capturing prelude that posts `{ type: 'interstitial:error', message }` on `window.onerror`, and reports `{ ok: true }` on load with no error. Debounced 500ms on code change.

- [ ] **Step 2: Write the editor modal**

Two columns. Left: textarea, "Paste code" (Clipboard API with a graceful failure toast when permission is denied), status strip (green "Loads fine" / red "Error: …"), fallback-seconds input bounded 1–30. Right: live preview + fullscreen expand toggle. Bottom bar: Cancel / Save.

- [ ] **Step 3: Implement exit behaviour**

Track dirty state on code and fallback seconds. X or Cancel while dirty opens a `ConfirmDialog` offering Save / Discard / Keep editing. Save closes without prompting.

- [ ] **Step 4: Verify in the browser**

Paste working code, confirm green status and a live preview. Introduce a syntax error, confirm red status with the message. Toggle fullscreen. Edit then hit X, confirm the three-way prompt. Save and confirm the code persists and `/r/<slug>` plays it.

- [ ] **Step 5: Commit**

```bash
git add src/components/links
git commit -m "feat(links): interstitial editor modal with live preview and load validation"
```

---

### Task 8: QR modal + stats modal

**Files:**
- Create: `src/components/links/QrModal.tsx`
- Create: `src/components/links/LinkStatsModal.tsx`
- Modify: `src/components/links/LinkCard.tsx` (wire both kebab entries)
- Modify: `package.json` (add `qrcode`, `@types/qrcode`)

**Interfaces:**
- Consumes: `Modal`, `SplitButton` from Task 4; `loadLinkStats` from Task 6.
- Produces: `<QrModal open link onClose />`, `<LinkStatsModal open link onClose />`.

- [ ] **Step 1: Install the dependency**

```bash
npm install qrcode && npm install -D @types/qrcode
```

- [ ] **Step 2: Write `QrModal`**

Live canvas preview from `${SITE_URL}/r/${slug}` using `QRCode.toCanvas`. Transparent/solid background toggle (`ToggleSwitch`), background colour picker (disabled while transparent), foreground colour picker — both native `<input type="color">` styled to match the design tokens. Transparent maps to `#00000000` in the qrcode `color.light` option.

- [ ] **Step 3: Implement export**

`SplitButton` with Download PNG · Download SVG · Copy as PNG · Copy as SVG. PNG via `canvas.toBlob`, SVG via `QRCode.toString({ type: 'svg' })`. Copy uses `navigator.clipboard.write` with a `ClipboardItem`; SVG copy falls back to `writeText`. Toast on both success and failure.

- [ ] **Step 4: Write `LinkStatsModal`**

Calls `loadLinkStats` on open. Renders total clicks, unique clicks, last clicked, a 30-day bar chart as plain divs (no charting library), device split percentages, and top referrers with the `Direct / QR scan` bucket. Empty state when there are no clicks yet.

- [ ] **Step 5: Verify in the browser**

Open the QR modal, change both colours, toggle transparency, download a PNG and an SVG and confirm both scan correctly to the short link. Open the stats modal on a link with clicks and confirm the numbers match the `link_clicks` table.

- [ ] **Step 6: Typecheck, build, and commit**

```bash
npx tsc --noEmit && npm run build
git add -A
git commit -m "feat(links): QR generation modal and aggregated per-link stats"
```

---

## Self-Review

**Spec coverage:** §3 → Task 1 · §4 → Task 2 · §5 → Task 3 · §6/§7 → Task 6 · §8.1 → Task 4 · §8.2 → Task 6 · §8.3 → Task 7 · §8.4/§8.5 → Task 8 · §9 → Task 5 · §11 → Task 2 step 4.

**Type consistency:** `loadLinkStats` / `LinkStats` (Tasks 6, 8), `updateLink(id, patch)` (Tasks 6, 7), `interstitial:ready` (Tasks 3, 7), `ToggleSwitch` prop `checked` (Tasks 4, 5, 6, 8) — all consistent.

**Known risk:** Task 5's fidelity requirement is the one place a "correct" refactor can still be wrong. Screenshot comparison is a mandatory gate, not a nicety.
