'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from 'lucide-react';
import type { Day } from '@/lib/trips/schema';
import { REGIONS, dayRegion } from '@/lib/trips/regions';
import { daysUntil, formatDateRo, weekdayName } from '@/lib/trips/time';
import { forecastUrl, parseForecast, weatherKind, weatherText, type DayWeather, type Forecast, type WeatherKind } from '@/lib/trips/weather';
import { useTrip } from '../TripProvider';
import { CACHE_KEY } from '../tripConfig';

const KEY = `${CACHE_KEY}:weather`;
const FRESH_MS = 3 * 60 * 60 * 1000;
/** Further ahead than this a forecast is only a rough idea: drawn fainter and marked "~". */
const RELIABLE_DAYS = 7;

const ICONS: Record<WeatherKind, { Icon: LucideIcon; color: string }> = {
  sun: { Icon: Sun, color: '#f59e0b' },
  partly: { Icon: CloudSun, color: '#d97706' },
  cloud: { Icon: Cloud, color: '#737373' },
  fog: { Icon: CloudFog, color: '#737373' },
  drizzle: { Icon: CloudDrizzle, color: '#0ea5e9' },
  rain: { Icon: CloudRain, color: '#2563eb' },
  snow: { Icon: CloudSnow, color: '#38bdf8' },
  storm: { Icon: CloudLightning, color: '#7c3aed' },
};

const WeatherCtx = createContext<Forecast>({});

/** Last forecast from this device right away (also offline), refreshed from the network every few hours. */
export function useForecast(): Forecast {
  const [data, setData] = useState<Forecast>(() => {
    try {
      return (JSON.parse(localStorage.getItem(KEY) ?? 'null') as { data: Forecast } | null)?.data ?? {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    let at = 0;
    try {
      at = (JSON.parse(localStorage.getItem(KEY) ?? 'null') as { at: number } | null)?.at ?? 0;
    } catch {
      /* no saved forecast */
    }
    if (Date.now() - at < FRESH_MS || !navigator.onLine) return;
    let gone = false;
    fetch(forecastUrl())
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        const parsed = parseForecast(json);
        if (gone || Object.keys(parsed).length === 0) return;
        setData(parsed);
        try {
          localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data: parsed }));
        } catch {
          /* convenience only */
        }
      })
      .catch(() => undefined); // the calendar simply shows no weather
    return () => {
      gone = true;
    };
  }, []);
  return data;
}

export const WeatherProvider = WeatherCtx.Provider;

/** One day's forecast, for the part of the Bay Area that day happens in. */
export function useDayWeather(day: Day) {
  const forecast = useContext(WeatherCtx);
  const { places, today } = useTrip();
  const region = useMemo(() => dayRegion(day.items, places), [day.items, places]);
  const weather = forecast[region]?.[day.date] ?? null;
  return { weather, region, rough: daysUntil(today, day.date) > RELIABLE_DAYS };
}

function WeatherIcon({ weather, size }: { weather: DayWeather; size: number }) {
  const { Icon, color } = ICONS[weatherKind(weather.code).kind];
  return <Icon size={size} style={{ color }} className="flex-shrink-0" aria-label={weatherKind(weather.code).label} />;
}

/** Icon and top temperature for a day column's header. */
export function WeatherMini({ day }: { day: Day }) {
  const { weather, region, rough } = useDayWeather(day);
  if (!weather) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 flex-shrink-0 text-[10px] font-semibold tabular-nums text-neutral-700 ${rough ? 'opacity-60' : ''}`} title={`${REGIONS[region].label}: ${weatherText(weather)}`}>
      <WeatherIcon weather={weather} size={12} />
      {rough ? '~' : ''}
      {weather.max}°
    </span>
  );
}

/** Agenda: one line next to the day's name. */
export function WeatherLine({ day }: { day: Day }) {
  const { weather, region, rough } = useDayWeather(day);
  if (!weather) return null;
  return (
    <span className={`ml-auto inline-flex items-center gap-1 flex-shrink-0 text-xs font-semibold tabular-nums text-neutral-700 ${rough ? 'opacity-60' : ''}`} title={`${REGIONS[region].label}: ${weatherText(weather)}`}>
      <WeatherIcon weather={weather} size={15} />
      {rough ? '~' : ''}
      {weather.min}–{weather.max}°
      {weather.rain != null && weather.rain >= 20 && <span className="text-blue-600">{weather.rain}%</span>}
    </span>
  );
}

/** Agenda: the whole trip's weather at a glance; a tap jumps to that day. */
export function WeatherStrip({ days, onPick }: { days: Day[]; onPick: (date: string) => void }) {
  const forecast = useContext(WeatherCtx);
  if (Object.keys(forecast).length === 0) return null;
  return (
    <>
      <section aria-label="Vremea pe zile" className="-mx-4 px-4">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((d) => (
            <StripDay key={d.date} day={d} onPick={onPick} />
          ))}
        </div>
      </section>
      <p className="text-[10px] leading-snug text-neutral-500">
        Vremea e pentru zona fiecărei zile. „~” = peste {RELIABLE_DAYS} zile, doar orientativ; zilele prea îndepărtate apar când există prognoză. Date:{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline">
          Open-Meteo
        </a>
        .
      </p>
    </>
  );
}

function StripDay({ day, onPick }: { day: Day; onPick: (date: string) => void }) {
  const { weather, region, rough } = useDayWeather(day);
  return (
    <button
      type="button"
      data-strip-date={day.date}
      onClick={() => onPick(day.date)}
      aria-label={`${formatDateRo(day.date)}: ${weather ? weatherText(weather) : 'fără prognoză încă'}`}
      className={`flex-shrink-0 w-[58px] rounded-xl border border-neutral-200 bg-white py-1 flex flex-col items-center ${rough ? 'opacity-70' : ''}`}
    >
      <span className="text-[10px] font-semibold uppercase text-neutral-500">
        {weekdayName(day.date).slice(0, 2)} {Number(day.date.slice(8))}
      </span>
      {weather ? (
        <>
          <WeatherIcon weather={weather} size={20} />
          <span className="text-xs font-bold tabular-nums">
            {rough ? '~' : ''}
            {weather.max}°<span className="font-normal text-neutral-500">/{weather.min}°</span>
          </span>
          <span className={`text-[10px] font-semibold tabular-nums ${weather.rain != null && weather.rain >= 40 ? 'text-blue-600' : 'text-neutral-400'}`}>{weather.rain ?? 0}%</span>
        </>
      ) : (
        <span className="h-[48px] flex items-center text-[10px] text-neutral-400">—</span>
      )}
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: REGIONS[region].hex }} title={REGIONS[region].label} />
    </button>
  );
}
