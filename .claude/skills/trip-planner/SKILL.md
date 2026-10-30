---
name: trip-planner
description: Read and change the San Francisco trip (2–19 Nov 2026) stored in Supabase — days, places, schedule, costs, bookings, travel times. Use whenever the user asks what is planned for a day, wants to move or add something, asks about the budget or tickets, wants travel times computed, or wants the plan pushed to Google Calendar.
---

# Trip planner (sf-2026)

The trip lives in one JSON document: Supabase project `lqbyvubbzexujviflunv`, table `public.trip_documents`, row `id = 'sf-2026'`, column `doc`.
The app at `alexandrugrigore.com/admin/trips/sf-2026` reads the same row and shows changes within ~20 seconds.
Answer in the user's language (usually Romanian). Never address the user by name.

## Facts you can rely on
- Dates are `YYYY-MM-DD` in America/Los_Angeles. Trip: Mon 2026-11-02 → Thu 2026-11-19 (18 days). "Azi" means today in San Francisco, not in Romania.
- Money is integer cents (`amountCents`), USD. `null` = price unknown. `amountMaxCents` only for ranges.
- Days have `status`: `confirmed` (decided by the user) or `draft` (a proposal). Only 2026-11-02 (Stanford) and 2026-11-19 (departure) start confirmed.
- Weekdays: 0 = Sunday … 6 = Saturday (`dow`). `hours.closedWeekdays` uses the same numbers.

## Read (views, one row per thing)
- Day plan: `select date, position, name, start, duration_min, done, min_cents, missing_prices from public.trip_items_v where trip_id = 'sf-2026' and date = '<date>' order by position;`
- Whole trip at a glance: `select date, title, status, min_cents, max_cents, missing_prices from public.trip_day_budget_v where trip_id = 'sf-2026' order by date;`
- Places and where they are scheduled: `select place_id, name, kind, area, closed_weekdays, booking_required, booking_status, scheduled_dates from public.trip_places_v where trip_id = 'sf-2026' order by position;`
- Prices still missing: `select scope, date, item_name, cost_id, label from public.trip_cost_lines_v where trip_id = 'sf-2026' and amount_cents is null order by date nulls first;`
- Tickets to buy: `select name, booking_status, booking_url, scheduled_dates from public.trip_places_v where trip_id = 'sf-2026' and booking_required and booking_status = 'todo';`
- Full JSON of one place: `select p from public.trip_documents d, jsonb_array_elements(d.doc->'places') p where d.id = 'sf-2026' and p->>'id' = '<place id>';`

## Change (functions only — one call per change)
| Want | Call |
|---|---|
| Move / reorder an item | `select public.trip_move_item('sf-2026', '<item id>', '<to date>', <position or null>);` |
| New place (e.g. a restaurant) | `select public.trip_add_place('sf-2026', '{"id":"<slug>","name":"…","kind":"food","area":"sf","location":{"name":"…","address":"…","lat":…,"lng":…,"googlePlaceId":"…"},"notes":"O masă: $14–17. …"}'::jsonb);` — kinds: zone, attraction, museum, daytrip, event, nature, food; geocode with the Google Maps MCP first. Food places: put the meal price at the start of `notes` ("O masă: $X–Y."), leave `costTemplate` empty (food is budgeted per day, in `day.costs` category `mancare`). |
| Schedule a place | `select public.trip_add_item('sf-2026', '<date>', '{"id":"i-MMDD-<place>","placeId":"<place>"}'::jsonb, <position or null>);` (copies the place's cost template) |
| Add a non-place item (ferry, deadline) | `... trip_add_item(..., '{"id":"i-MMDD-<slug>","label":"Feribot …","kind":"transport","start":"09:25","fixed":true}'::jsonb)` |
| Unschedule | `select public.trip_remove_item('sf-2026', '<item id>');` |
| Time, duration, done, notes | `select public.trip_update_item('sf-2026', '<item id>', '{"start":"10:00","durationMin":120}'::jsonb);` |
| Confirm a day / rename | `select public.trip_update_day('sf-2026', '<date>', '{"status":"confirmed"}'::jsonb);` |
| Price | `select public.trip_update_cost('sf-2026', '<fixed|day|item>', <null|'<date>'|'<item id>'>, '<cost id>', '{"amountCents":1250,"source":"claude","verifiedAt":"<today>","note":"<source URL>"}'::jsonb);` |
| New cost line | `select public.trip_add_cost('sf-2026', '<scope>', <owner>, '{"id":"<slug>","label":"…","category":"transport"}'::jsonb);` |
| Booking | `select public.trip_set_booking('sf-2026', '<place id>', '{"status":"booked","reference":"…"}'::jsonb);` |
| Place details | `select public.trip_update_place('sf-2026', '<place id>', '{"hours":{…}}'::jsonb);` |
| Accommodation | `select public.trip_set_base('sf-2026', '{"name":"…","address":"…","lat":…,"lng":…}'::jsonb);` (clears travel times from/to the old base) |
| Travel times | `select public.trip_merge_legs('sf-2026', '{"base>alcatraz>transit":{"minutes":24,"computedAt":"<ISO>","departAt":"<ISO>","summary":"Muni F"}}'::jsonb);` |
| Arrival / departure time, RON rate | `select public.trip_update_trip('sf-2026', '{"arrival":{"date":"2026-11-02","time":"14:35","airport":"SFO"}}'::jsonb);` |

Item ids: `i-<MMDD>-<place id or slug>`; if taken, add `-2`. Cost ids are slugs, unique within their list.
After every change say exactly what changed: `zi · element · vechi → nou`.

## Procedures
**Travel times** (needs `trip.base`; if it is null, say so and stop). For each day, chain `base → item1 → item2 … → base` over items that have a `placeId`. Use the Google Maps MCP (`maps_distance_matrix`, or `maps_directions` for one pair) with mode `transit`, departure time = that date + the item's start (or 09:00) in America/Los_Angeles. Use the place's `meetingPoint` when it has one (Alcatraz → Pier 33, Angel Island and Napa → Ferry Building), else `location`. Write all results of a day in one `trip_merge_legs` call. Report the day totals.

**Prices.** Only official sources (operator or venue site). Write `amountCents`, `source: "claude"`, `verifiedAt`, and the URL in `note`. If you cannot confirm a price, leave it null and say so; never estimate silently. Student prices need a valid student ID — ask before using them.

**Proposing an itinerary.** Respect, in this order: confirmed days (never move them), `fixed` items, `hours.closedWeekdays` and opening hours, last ferries (`kind: "deadline"`), people's availability noted in day notes (Clara for Berkeley), the IMAX screening date. Group by `area` to keep travel short; keep a reserve day. Propose in chat first; apply only after the user agrees; new days stay `draft` until the user confirms them.

**Google Calendar.** Only when asked, only `confirmed` days. One event per item with a start time (duration = `durationMin`, location = meeting point or location, description = notes + link to `/admin/trips/sf-2026/zile/<date>`), otherwise one all-day event for the day. Save the event id with `trip_update_item(..., '{"calendarEventId":"…"}')`; next time update that event instead of creating a duplicate.

## Never
- Never write the whole `doc` column, never `delete` from `trip_documents`, never touch `runway_*` tables or `runway_private`.
- Never delete a place. Unscheduling an item is fine only when asked.
- Never mark something paid or booked, confirm a day, or change dates unless the user said so.
- Never change `trip.startDate`, `trip.endDate`, `trip.timezone` or `trip.id`.
- Bigger reorganisations (rebuilding many days at once): do them in Claude Code with the TypeScript mutations in `src/lib/trips/mutations.ts`, validated by `TripDoc` and saved with `trip_save`.

## In this repo
- App: `src/app/admin/trips/sf-2026/` (routes) and `src/components/trips/` (screens, `TripProvider`); library and tests in `src/lib/trips/` (`npm run test:trips`).
- Database: `supabase/migrations/20261030120000_create_trip_planner.sql`, `20261030120100_create_trip_media.sql`. Seed: `data/trips/sf-2026.seed.json` (already imported; the database is now the source of truth).
- Photos: `npm run trips:photos -- --media "<Obsidian>/Writing/Media" --dry-run` (needs `SUPABASE_SERVICE_ROLE_KEY` in the shell, never in the repo).
- Food: each day has a `mancare` line in `day.costs`; Buget shows them in their own "Mâncare" section. Food places (`kind: "food"`) are an orange layer on the map.
- "Întreabă AI" in the app header builds a prompt from the current screen (selected place, day, location) and opens claude.ai/new?q=… — such prompts start with "Sunt în călătorie în San Francisco… folosesc aplicația mea de planificare".
- Photos: local-only import on Locuri (`next dev`) or `npm run trips:photos`; the dev server can't read the Google Drive folder, so copy the PNGs to a local folder first.
- The app accepts `?azi=YYYY-MM-DD` on any trip page to preview another day as "today".
