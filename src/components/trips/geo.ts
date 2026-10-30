// Distances for "what's near me" — straight line (haversine), good enough to rank places in a city.
import type { Place } from '@/lib/trips/schema';

export type LatLng = { lat: number; lng: number };

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Places with a location, nearest first. */
export function nearest(from: LatLng, places: Place[], limit = 5): { place: Place; km: number }[] {
  return places
    .filter((p) => p.location)
    .map((p) => ({ place: p, km: distanceKm(from, p.location!) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

export const kmText = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);

/** Ask the browser for the current position (the phone asks for permission the first time). */
export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Telefonul nu oferă locația.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'Ai refuzat accesul la locație.' : 'Nu am putut afla locația.')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
