// src/lib/trips/weather.ts — daily forecast per part of the Bay Area, from Open-Meteo (free, no key, CORS, 16 days ahead).
// Only the centre of each region is sent, never the home address.
import { REGIONS, type Region } from "./regions";

export type DayWeather = { code: number; max: number; min: number; rain: number | null; wind: number | null };
export type Forecast = Partial<Record<Region, Record<string, DayWeather>>>;
export type WeatherKind = "sun" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "storm";

const POINTS: Record<Region, [number, number]> = {
  sf: [37.77, -122.42],
  peninsula: [37.43, -122.17],
  "east-bay": [37.87, -122.27],
  north: [37.9, -122.55],
  coast: [37.46, -122.43],
};
const ORDER = Object.keys(REGIONS) as Region[];

export function forecastUrl(): string {
  const q = new URLSearchParams({
    latitude: ORDER.map((r) => POINTS[r][0]).join(","),
    longitude: ORDER.map((r) => POINTS[r][1]).join(","),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    timezone: "America/Los_Angeles",
    forecast_days: "16",
  });
  return `https://api.open-meteo.com/v1/forecast?${q.toString()}`;
}

type Raw = {
  daily: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: (number | null)[];
  };
};

/** Open-Meteo answers with one entry per point, in the order asked. Days without temperatures are left out. */
export function parseForecast(json: unknown): Forecast {
  const out: Forecast = {};
  if (!Array.isArray(json)) return out;
  (json as Raw[]).forEach((point, n) => {
    const region = ORDER[n];
    const d = point?.daily;
    if (!region || !d?.time) return;
    const days: Record<string, DayWeather> = {};
    d.time.forEach((date, i) => {
      const max = d.temperature_2m_max[i];
      const min = d.temperature_2m_min[i];
      if (max == null || min == null) return;
      days[date] = {
        code: d.weather_code[i] ?? 3,
        max: Math.round(max),
        min: Math.round(min),
        rain: d.precipitation_probability_max[i] ?? null,
        wind: d.wind_speed_10m_max[i] == null ? null : Math.round(d.wind_speed_10m_max[i]!),
      };
    });
    out[region] = days;
  });
  return out;
}

/** WMO weather code → what to draw and say. */
export function weatherKind(code: number): { kind: WeatherKind; label: string } {
  if (code <= 1) return { kind: "sun", label: "senin" };
  if (code === 2) return { kind: "partly", label: "parțial noros" };
  if (code === 3) return { kind: "cloud", label: "înnorat" };
  if (code === 45 || code === 48) return { kind: "fog", label: "ceață" };
  if (code >= 51 && code <= 57) return { kind: "drizzle", label: "burniță" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { kind: "rain", label: "ploaie" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "snow", label: "ninsoare" };
  if (code >= 95) return { kind: "storm", label: "furtună" };
  return { kind: "cloud", label: "înnorat" };
}

/** "16–19°, parțial noros, ploaie 20%" for the AI prompt and tooltips. */
export const weatherText = (w: DayWeather) => `${w.min}–${w.max}°C, ${weatherKind(w.code).label}${w.rain != null ? `, ploaie ${w.rain}%` : ""}`;
