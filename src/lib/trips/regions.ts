// src/lib/trips/regions.ts — how far apart the parts of the Bay Area are, for "can I realistically make it?".
import type { Place } from "./schema";

export type Region = "sf" | "peninsula" | "east-bay" | "north" | "coast";

export const REGIONS: Record<Region, { label: string; short: string; hex: string }> = {
  sf: { label: "San Francisco", short: "SF", hex: "#2563eb" },
  peninsula: { label: "Stanford / Peninsula", short: "Peninsula", hex: "#9333ea" },
  "east-bay": { label: "Berkeley / East Bay", short: "East Bay", hex: "#ea580c" },
  north: { label: "Marin / Napa", short: "Nord", hex: "#059669" },
  coast: { label: "Coastă", short: "Coastă", hex: "#0891b2" },
};

const OF_AREA: Record<Place["area"], Region> = {
  sf: "sf",
  bay: "sf", // Alcatraz and Angel Island: the ferries leave from the city
  peninsula: "peninsula",
  "south-bay": "peninsula",
  "east-bay": "east-bay",
  marin: "north",
  napa: "north",
  coast: "coast",
};

export const regionOf = (place: Pick<Place, "area">): Region => OF_AREA[place.area];

// Minutes by public transport, rounded up. Measured on Google Maps for a weekday afternoon (Nov 2026) between Mission,
// Stanford, Berkeley and Sausalito; sf-coast is the day's own Caltrain + SamTrans plan. Other pairs use UNMEASURED_MIN.
const MINUTES: Record<string, number> = {
  "peninsula|sf": 100,
  "east-bay|sf": 70,
  "east-bay|peninsula": 145,
  "north|sf": 65,
  "north|peninsula": 155,
  "east-bay|north": 100,
  "coast|sf": 150,
};
const UNMEASURED_MIN = 120;

/** Typical travel between two regions; 0 inside the same one. An estimate, not a timetable. */
export function regionMinutes(a: Region, b: Region): number {
  if (a === b) return 0;
  return MINUTES[[a, b].sort().join("|")] ?? UNMEASURED_MIN;
}

/** Town for labels: "Stanford" from "520 Lasuen Mall, Stanford, CA 94305, USA"; the region's name without an address. */
export function cityOf(place: Pick<Place, "area" | "location">): string {
  const town = place.location?.address?.match(/,\s*([^,]+),\s*CA\b/)?.[1]?.trim();
  return town ?? REGIONS[regionOf(place)].label;
}

/** The town as short as a calendar block needs it. */
export const cityShort = (place: Pick<Place, "area" | "location">) => {
  const city = cityOf(place);
  return city === REGIONS.sf.label ? REGIONS.sf.short : city === REGIONS[regionOf(place)].label ? REGIONS[regionOf(place)].short : city;
};
