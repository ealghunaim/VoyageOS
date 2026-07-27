import * as CFG from './config';
import { getToken, refreshSession } from './auth';
const API_URL = CFG.API_URL;
const APP_KEY: string = (CFG as any).APP_KEY ?? '';

let onAuthFail: (() => void) | null = null;
export function setAuthFailHandler(fn: () => void) { onAuthFail = fn; }

export type Trip = {
  place?: string | null; country_code?: string | null; travel_mode?: string | null;
  id: string; title: string; start_date: string; end_date: string;
  trip_type?: string | null; status: string;
};
export type PackItem = {
  id: string; name: string; category: string; qty: number;
  status: 'suggested' | 'accepted' | 'packed' | 'rejected';
  reason?: string | null; source: string;
};

async function req(path: string, options: RequestInit = {}, _retried = false): Promise<any> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(APP_KEY ? { 'x-voyageos-key': APP_KEY } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
  } catch (e) {
    throw new Error("Can't reach the VoyageOS server — check your connection.");
  }
  if (res.status === 401 && token && !_retried) {
    if (await refreshSession()) return req(path, options, true);
    onAuthFail?.();
    throw new Error('Session expired — sign in again.');
  }
  if (res.status === 401 && token && _retried) {
    onAuthFail?.();
    throw new Error('Session expired — sign in again.');
  }
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { const j = await res.json(); detail = j.detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export const listTrips = (): Promise<Trip[]> => req('/v1/trips');
export const createTrip = (b: object): Promise<Trip> =>
  req('/v1/trips', { method: 'POST', body: JSON.stringify(b) });
export const addDestination = (tripId: string, b: object) =>
  req(`/v1/trips/${tripId}/destinations`, { method: 'POST', body: JSON.stringify(b) });
export const addActivity = (tripId: string, b: object) =>
  req(`/v1/trips/${tripId}/activities`, { method: 'POST', body: JSON.stringify(b) });
export const generateList = (tripId: string, regenerate = false) =>
  req(`/v1/trips/${tripId}/packing-lists/generate?regenerate=${regenerate}`, { method: 'POST' });
export const getPackingList = (tripId: string): Promise<{ items: PackItem[] }> =>
  req(`/v1/trips/${tripId}/packing-list`);
export const updateItem = (itemId: string, b: object): Promise<PackItem> =>
  req(`/v1/packing-items/${itemId}`, { method: 'PATCH', body: JSON.stringify(b) });

export type Task = {
  id: string; title: string; kind: string; due_at: string; status: string;
};
export const getTimeline = (
  tripId: string, tz: string
): Promise<{ tasks: Task[]; reminders: { id: string; send_at: string; payload: any }[] }> =>
  req(`/v1/trips/${tripId}/timeline?tz=${encodeURIComponent(tz)}`);

export const searchItems = (q: string): Promise<{ id: string; name: string; category: string }[]> =>
  req(`/v1/items/search?q=${encodeURIComponent(q)}`);
export const submitDebrief = (
  tripId: string, forgot: string[], unused: string[]
): Promise<{ forgot: number; unused: number; packed_recorded: number; promise: string }> =>
  req(`/v1/trips/${tripId}/debrief`, {
    method: 'POST', body: JSON.stringify({ forgot, unused }),
  });


export type Kit = { id: string; name: string; item_count?: number };
export const listKits = (): Promise<Kit[]> => req('/v1/gear-profiles');
export const createKit = (name: string): Promise<Kit> =>
  req('/v1/gear-profiles', { method: 'POST', body: JSON.stringify({ name }) });
export const getKit = (id: string): Promise<Kit & { items: { item_id: string; name: string; qty: number }[] }> =>
  req(`/v1/gear-profiles/${id}`);
export const addKitItem = (id: string, name: string) =>
  req(`/v1/gear-profiles/${id}/items`, { method: 'POST', body: JSON.stringify({ name }) });
export const removeKitItem = (id: string, itemId: string) =>
  req(`/v1/gear-profiles/${id}/items/${itemId}`, { method: 'DELETE' });
export const applyKit = (id: string, tripId: string): Promise<{ added: number; already_there: number; kit: string }> =>
  req(`/v1/gear-profiles/${id}/apply/${tripId}`, { method: 'POST' });

export type WeightInfo = { total_g: number; counted: number; unweighed: number; limit_g: number | null };
export const getWeight = (tripId: string): Promise<WeightInfo> => req(`/v1/trips/${tripId}/weight`);
export const setBagLimit = (tripId: string, limit_g: number | null) =>
  req(`/v1/trips/${tripId}/bag`, { method: 'PUT', body: JSON.stringify({ limit_g }) });

export type Doc = {
  id: string; type: string; label: string; expiry_date: string | null;
  country_code: string | null;
  expiry: { level: string; message: string; days_left: number | null };
};
export const listDocuments = (): Promise<Doc[]> => req('/v1/documents');
export const createDocument = (b: object): Promise<Doc> =>
  req('/v1/documents', { method: 'POST', body: JSON.stringify(b) });
export const deleteDocument = (id: string) =>
  req(`/v1/documents/${id}`, { method: 'DELETE' });

export type WxDay = {
  date: string; temp_max: number | null; temp_min: number | null;
  precip_prob: number | null; wind_kph: number | null; uv: number | null;
  snow_cm?: number | null; provider?: string | null;
};
export const getTripWeather = (tripId: string): Promise<{ place: string | null; days: WxDay[] }> =>
  req(`/v1/trips/${tripId}/weather`);
export const refreshTripWeather = (tripId: string): Promise<{
  ok: boolean; place?: string; insights?: { key: string; reason: string }[];
  applied?: string[]; covered?: string[]; items_added?: number;
  notifications_queued?: number; note?: string | null;
}> => req(`/v1/trips/${tripId}/weather/refresh`, { method: 'POST' });

export type PlaceHit = {
  name: string; admin: string | null; country_code: string; lat: number; lng: number;
};
export const searchPlaces = (q: string): Promise<PlaceHit[]> =>
  req(`/v1/places/search?q=${encodeURIComponent(q)}`);

export type Guide = {
  power: { plugs: string; note: string };
  etiquette: string[]; customs_flags: string[];
  eat: { name: string; note: string }[];
  play: { name: string; note: string }[];
  visit: { name: string; note: string }[];
  go: { from_airport: string[]; around: string[] };
  health?: string[];
  task_suggestions: string[];
};
export const getGuide = (tripId: string, regenerate = false):
  Promise<{ guide: Guide; cached: boolean; cost_usd: number }> =>
  req(`/v1/trips/${tripId}/guide?regenerate=${regenerate}`);

export type Companion = { name: string; relation: 'partner' | 'child' | 'parent' | 'friend' | 'other'; dob?: string | null };
export type Profile = {
  dob: string | null; gender: string | null; nationality: string | null;
  members: Companion[] | null;
  emergency_contact?: { name: string; phone: string } | null;
};
export const getProfile = (): Promise<Profile> => req('/v1/me/profile');
export const putProfile = (b: Partial<Profile>): Promise<Profile> =>
  req('/v1/me/profile', { method: 'PUT', body: JSON.stringify(b) });

export type TripDetail = Trip & {
  destinations: { place_name: string; country_code: string | null }[];
};
export const getTrip = (id: string): Promise<TripDetail> => req(`/v1/trips/${id}`);
export type Note = { id: string; body: string; created_at: string };
export const listNotes = (tripId: string): Promise<Note[]> => req(`/v1/trips/${tripId}/notes`);
export const addNote = (tripId: string, body: string): Promise<Note> =>
  req(`/v1/trips/${tripId}/notes`, { method: 'POST', body: JSON.stringify({ body }) });

export const patchTrip = (id: string, b: { title?: string; start_date?: string; end_date?: string }): Promise<Trip> =>
  req(`/v1/trips/${id}`, { method: 'PATCH', body: JSON.stringify(b) });
export const deleteTrip = (id: string): Promise<void> =>
  req(`/v1/trips/${id}`, { method: 'DELETE' });
