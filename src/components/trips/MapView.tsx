'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '@/lib/trips/schema';

export type MapMarker = { id: string; lat: number; lng: number; color: string; title: string; label?: string; food?: boolean };

// San Francisco proper, for the "Oraș" button.
const SF_BOUNDS = L.latLngBounds([37.705, -122.52], [37.835, -122.355]);

const pin = (m: MapMarker) =>
  L.divIcon({
    className: '',
    iconSize: m.label ? [28, 28] : [18, 18],
    iconAnchor: m.label ? [14, 14] : [9, 9],
    html: `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:9999px;background:${m.color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);color:#fff;font:700 12px/1 system-ui,sans-serif">${m.label ?? ''}</span>`,
  });

// Food places: rounded square with a fork-and-knife glyph, so they read apart from sights.
const foodPin = (m: MapMarker) =>
  L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:7px;background:${m.color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);color:#fff;font-size:12px;line-height:1">🍴</span>`,
  });

const me = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span style="display:block;width:100%;height:100%;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></span>',
});

const home = L.divIcon({
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: '<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:8px;background:#111;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);color:#fff;font-size:15px">⌂</span>',
});

/** Leaflet + OpenStreetMap. No API key; navigation itself goes through Google Maps deep links. */
export default function MapView({
  markers,
  base,
  line,
  fit,
  onSelect,
  user,
}: {
  markers: MapMarker[];
  base: GeoPoint | null;
  line: boolean;
  user: { lat: number; lng: number } | null;
  fit: { mode: 'city' | 'all'; n: number };
  onSelect: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(m);
    m.fitBounds(SF_BOUNDS);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  const allBounds = () => {
    // In a day view, frame the day's stops (food pins may sit outside them); otherwise everything.
    const framed = line && markers.some((m) => !m.food) ? markers.filter((m) => !m.food) : markers;
    const pts: L.LatLngExpression[] = framed.map((m) => [m.lat, m.lng]);
    if (base) pts.push([base.lat, base.lng]);
    if (user) pts.push([user.lat, user.lng]);
    return pts.length ? L.latLngBounds(pts) : SF_BOUNDS;
  };

  useEffect(() => {
    const g = layer.current;
    const m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    const stops = markers.filter((x) => !x.food);
    if (line && stops.length > 1) {
      L.polyline(
        stops.map((x) => [x.lat, x.lng] as L.LatLngTuple),
        { color: stops[0].color, weight: 3, opacity: 0.7, dashArray: '6 6' },
      ).addTo(g);
    }
    for (const mk of markers) {
      L.marker([mk.lat, mk.lng], { icon: mk.food ? foodPin(mk) : pin(mk), title: mk.title, keyboard: true, zIndexOffset: mk.food ? -100 : 0 })
        .on('click', () => select.current(mk.id))
        .addTo(g);
    }
    if (base) L.marker([base.lat, base.lng], { icon: home, title: base.name ?? 'Cazare' }).addTo(g);
    if (user) L.marker([user.lat, user.lng], { icon: me, title: 'Tu ești aici', zIndexOffset: 1000 }).addTo(g);
    m.fitBounds(allBounds(), { padding: [30, 30], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, base, line, user]);

  useEffect(() => {
    if (!map.current || fit.n === 0) return;
    map.current.fitBounds(fit.mode === 'city' ? SF_BOUNDS : allBounds(), { padding: [30, 30], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit]);

  return <div ref={el} className="h-full w-full" />;
}
