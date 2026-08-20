// Filtering a guide's recommendations by distance from where you are staying.
//
// LOCAL, ALWAYS. The coordinates were fetched once at generation time and
// stored with the guide, so panning a radius costs nothing and meters nothing.
// That is the whole reason the lookups happen in a background task rather than
// per query.
//
// THE ANCHOR IS NAMED IN THE COPY. "Within 2km" is meaningless without saying
// of what — a filter anchored on the city centre and one anchored on a hotel
// across town give different answers, and the traveller cannot tell which they
// are looking at unless it says so.
import type { TripStop } from './api';

export type Located = { name: string; coords?: { lat: number; lng: number } | null };

export type Anchor = { lat: number; lng: number; label: string };

/** Where the radius is measured from: the accommodation if one is set,
 *  otherwise the destination itself. */
export function anchorFor(dest: TripStop | undefined): Anchor | null {
  if (!dest || dest.lat == null || dest.lng == null) return null;
  const acc = (dest as any).accommodation as { name?: string; lat?: number; lng?: number } | null;
  if (acc?.lat != null && acc?.lng != null) {
    return { lat: acc.lat, lng: acc.lng, label: acc.name || 'your stay' };
  }
  return { lat: dest.lat, lng: dest.lng, label: `${dest.place_name} centre` };
}

export function distanceKm(a: Anchor, lat: number, lng: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat - a.lat);
  const dLng = rad(lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rows within `km` of the anchor, nearest first.
 *
 *  Rows WITHOUT coordinates are dropped, not kept — a filter that silently
 *  passes everything it could not measure is not a filter. The count beside it
 *  is what makes that honest: "6 of 12 located" tells the reader what the
 *  filter could see.
 */
export function within<T extends Located>(rows: T[], anchor: Anchor | null, km: number):
    (T & { km: number })[] {
  if (!anchor) return [];
  return rows
    .filter(r => r.coords)
    .map(r => ({ ...r, km: distanceKm(anchor, r.coords!.lat, r.coords!.lng) }))
    .filter(r => r.km <= km)
    .sort((a, b) => a.km - b.km);
}
