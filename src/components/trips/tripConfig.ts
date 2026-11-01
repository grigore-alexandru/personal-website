// Shared constants for the San Francisco trip app (/admin/trips/sf-2026).
import type { Day, Place } from '@/lib/trips/schema';

export const TRIP_ID = 'sf-2026';
export const TRIP_TZ = 'America/Los_Angeles';
export const BASE = '/admin/trips/sf-2026';
export const CACHE_KEY = `trip:${TRIP_ID}`;
export const POLL_MS = 20_000;
export const PHOTO_URL_TTL_S = 60 * 60 * 12;
export const PHOTO_BUCKET = 'trip-media';

/** `also`: other paths that light up the tab (Locuri lives under Hartă; place pages keep their /locuri URL). */
export const TABS: readonly { href: string; label: string; icon: 'sun' | 'calendar' | 'clock' | 'map' | 'ticket' | 'wallet'; also?: readonly string[] }[] = [
  { href: `${BASE}/azi`, label: 'Azi', icon: 'sun' },
  { href: `${BASE}/zile`, label: 'Zile', icon: 'calendar' },
  { href: `${BASE}/program`, label: 'Program', icon: 'clock' },
  { href: `${BASE}/harta`, label: 'Hartă', icon: 'map', also: [`${BASE}/locuri`] },
  { href: `${BASE}/bilete`, label: 'Bilete', icon: 'ticket' },
  { href: `${BASE}/buget`, label: 'Buget', icon: 'wallet' },
];

/** The places list, below the map. */
export const LOCURI_HREF = `${BASE}/harta#locuri`;

/** Day-kind styling. Status is never colour-only: drafts also get a dashed border and the word "propus". */
export const DAY_KIND: Record<Day['kind'], { label: string; tint: string; dot: string; hex: string }> = {
  city: { label: 'Oraș', tint: 'bg-sky-50', dot: 'bg-sky-500', hex: '#0ea5e9' },
  daytrip: { label: 'Excursie', tint: 'bg-emerald-50', dot: 'bg-emerald-500', hex: '#10b981' },
  valley: { label: 'Stanford / Valley', tint: 'bg-violet-50', dot: 'bg-violet-500', hex: '#8b5cf6' },
  travel: { label: 'Drum', tint: 'bg-neutral-100', dot: 'bg-neutral-500', hex: '#737373' },
};

export const UNSCHEDULED_HEX = '#a3a3a3';
/** Food places (restaurants, Whole Foods hot bars) on the map. */
export const FOOD_HEX = '#f97316';

export const PLACE_KIND: Record<Place['kind'], string> = {
  zone: 'Zonă',
  attraction: 'Atracție',
  museum: 'Muzeu',
  daytrip: 'Excursie',
  event: 'Eveniment',
  nature: 'Natură',
  food: 'Mâncare',
};

export const AREA: Record<Place['area'], string> = {
  sf: 'San Francisco',
  marin: 'Marin',
  'east-bay': 'East Bay',
  peninsula: 'Peninsula',
  'south-bay': 'South Bay',
  coast: 'Coastă',
  napa: 'Napa',
  bay: 'Golf',
};

/** Calendar colours of items without a place; places take their region's colour (lib/trips/regions). */
export const ITEM_KIND_HEX = { visit: '#0ea5e9', transport: '#64748b', deadline: '#f59e0b', note: '#737373' } as const;

export const dayHref = (date: string) => `${BASE}/zile/${date}`;
export const placeHref = (id: string) => `${BASE}/locuri/${id}`;

export type TripRoute = { screen: 'azi' | 'zile' | 'day' | 'program' | 'harta' | 'place' | 'bilete' | 'buget'; param: string; title: string };

/** Which screen a URL shows (TripRouter). Locuri lives on the Hartă screen. */
export function routeOf(pathname: string): TripRoute | null {
  if (!pathname.startsWith(`${BASE}/`)) return null;
  const [first, param = ''] = pathname.slice(BASE.length + 1).replace(/\/$/, '').split('/');
  const tab = (screen: TripRoute['screen'], title: string): TripRoute => ({ screen, param, title });
  if (first === 'zile') return param ? tab('day', 'Ziua') : tab('zile', 'Zile');
  if (first === 'locuri') return param ? tab('place', 'Loc') : tab('harta', 'Hartă');
  if (param) return null;
  if (first === 'azi') return tab('azi', 'Azi');
  if (first === 'program') return tab('program', 'Program');
  if (first === 'harta') return tab('harta', 'Hartă');
  if (first === 'bilete') return tab('bilete', 'Bilete');
  if (first === 'buget') return tab('buget', 'Buget');
  return null;
}
