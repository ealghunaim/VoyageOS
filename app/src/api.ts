import * as CFG from './config';
import { getToken, refreshSession } from './auth';
const API_URL = CFG.API_URL;
const APP_KEY: string = (CFG as any).APP_KEY ?? '';

let onAuthFail: (() => void) | null = null;
export function setAuthFailHandler(fn: () => void) { onAuthFail = fn; }

export type Segment = { mode: string; ref?: string | null; origin?: string | null; dest?: string | null; depart?: string | null; arrive?: string | null };
export type Trip = {
  place?: string | null; country_code?: string | null; travel_mode?: string | null;
  airline?: string | null; visa_status?: string | null; cabin_class?: string | null; depart_time?: string | null;
  segments?: Segment[] | null;
  with_kids?: boolean | null;
  traveler_types?: string[] | null;
  origin?: string | null; origin_country?: string | null; origin_lat?: number | null; origin_lng?: number | null;
  id: string; title: string; start_date: string; end_date: string;
  trip_type?: string | null; status: string;
};
export type PackItem = {
  style_tag?: string | null; weight_g?: number | null;
  id: string; name: string; category: string; qty: number;
  status: 'suggested' | 'accepted' | 'packed' | 'rejected';
  reason?: string | null; source: string;
};

export async function req(path: string, options: RequestInit = {}, _retried = false): Promise<any> {
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
  eat: { name: string; note: string; order?: string; when?: string; area?: string; price?: number }[];
  dishes?: { name: string; note: string }[];
  restaurants?: { name: string; note: string; area?: string; price?: number }[];
  play: { name: string; note: string }[];
  visit: { name: string; note: string; rating?: number | null; fee?: string; access?: string }[];
  go: { from_origin?: string[]; from_airport: string[]; around: string[] };
  health?: string[];
  souvenirs?: { name: string; note: string; price_band: string }[];
  visa_hint?: { status: string; note: string };
  airport?: { code: string; name: string; to_city: string; highlights: string[]; duty_free: string; smoking: string; tips: string[] };
  gateway?: { kind: string; code: string; name: string; to_city: string; highlights: string[]; duty_free: string; smoking: string; tips: string[] };
  gateways?: { kind: string; code: string; name: string; to_city: string; highlights: string[]; duty_free: string; smoking: string; tips: string[] }[];
  task_suggestions: string[];
};
export const getGuide = (tripId: string, regenerate = false):
  Promise<{ guide: Guide; cached: boolean; cost_usd: number }> =>
  req(`/v1/trips/${tripId}/guide?regenerate=${regenerate}`);
export const getGuidePart = (tripId: string, phase: 'a' | 'b', regenerate = false):
  Promise<{ guide: Partial<Guide>; phase: string; cached: boolean; cost_usd: number }> =>
  req(`/v1/trips/${tripId}/guide/part/${phase}?regenerate=${regenerate}`);

export type Companion = { name: string; relation: 'partner' | 'child' | 'parent' | 'friend' | 'other'; dob?: string | null };
export type HomeOrigin = { name: string; country?: string | null; lat?: number | null; lng?: number | null };
export type Profile = {
  dob: string | null; gender: string | null; nationality: string | null;
  members: Companion[] | null;
  emergency_contact?: { name: string; phone: string } | null;
  home_origin?: HomeOrigin | null;
};
export const getProfile = (): Promise<Profile> => req('/v1/me/profile');
export const putProfile = (b: Partial<Profile>): Promise<Profile> =>
  req('/v1/me/profile', { method: 'PUT', body: JSON.stringify(b) });

export type TripDetail = Trip & {
  destinations: { place_name: string; country_code: string | null }[];
};
export const getTrip = (id: string): Promise<TripDetail> => req(`/v1/trips/${id}`);
export type Note = { id: string; body: string; created_at: string; photos?: string[] };
export const listNotes = (tripId: string): Promise<Note[]> => req(`/v1/trips/${tripId}/notes`);
export const addNote = (tripId: string, body: string, photos: { b64: string; mime: string }[] = []): Promise<Note> =>
  req(`/v1/trips/${tripId}/notes`, { method: 'POST', body: JSON.stringify({ body, photos }) });

export const patchTrip = (id: string, b: { title?: string; start_date?: string; end_date?: string; airline?: string; visa_status?: string; cabin_class?: string; depart_time?: string; segments?: Segment[]; with_kids?: boolean; traveler_types?: string[]; origin?: string; origin_country?: string; origin_lat?: number; origin_lng?: number }): Promise<Trip> =>
  req(`/v1/trips/${id}`, { method: 'PATCH', body: JSON.stringify(b) });
export const deleteTrip = (id: string): Promise<void> =>
  req(`/v1/trips/${id}`, { method: 'DELETE' });

export type FoodTip = {
  id: string; restaurant: string; note: string; order_rec: string; when_rec: string;
  author: string; is_mine: boolean; created_at: string; photos?: string[];
};
export const listFoodTips = (place: string, cc?: string | null): Promise<FoodTip[]> =>
  req(`/v1/food-tips?place=${encodeURIComponent(place)}${cc ? `&cc=${cc}` : ''}`);
export const addFoodTip = (b: { place_name: string; country_code?: string | null; restaurant: string; note?: string; order_rec?: string; when_rec?: string; photos?: { b64: string; mime: string }[] }): Promise<FoodTip> =>
  req('/v1/food-tips', { method: 'POST', body: JSON.stringify(b) });
export const deleteFoodTip = (id: string): Promise<void> =>
  req(`/v1/food-tips/${id}`, { method: 'DELETE' });

export type PlanItem = { id: string; trip_id: string; day: number; time: string | null; title: string; note: string | null; done: boolean; seq: number };
export const listPlan = (tripId: string): Promise<PlanItem[]> =>
  req(`/v1/trips/${tripId}/plan`);
export const addPlanItem = (tripId: string, b: { day: number; title: string; time?: string; note?: string }): Promise<PlanItem> =>
  req(`/v1/trips/${tripId}/plan`, { method: 'POST', body: JSON.stringify(b) });
export const patchPlanItem = (tripId: string, itemId: string, b: { title?: string; time?: string; note?: string; done?: boolean; day?: number }): Promise<PlanItem> =>
  req(`/v1/trips/${tripId}/plan/${itemId}`, { method: 'PATCH', body: JSON.stringify(b) });
export const deletePlanItem = (tripId: string, itemId: string): Promise<void> =>
  req(`/v1/trips/${tripId}/plan/${itemId}`, { method: 'DELETE' });

export const quickAddItems = (tripId: string, text: string): Promise<PackItem[]> =>
  req(`/v1/trips/${tripId}/items/quick-add`, { method: 'POST', body: JSON.stringify({ text }) });

export const askTrip = (tripId: string, question: string): Promise<{ answer: string }> =>
  req(`/v1/trips/${tripId}/ask`, { method: 'POST', body: JSON.stringify({ question }) });

export const lookupFlight = (number: string, date: string): Promise<{ number: string; origin: string | null; dest: string | null; depart: string | null; arrive: string | null; status: string | null }> =>
  req(`/v1/flights/${encodeURIComponent(number)}/${date}`);

export const dishPhoto = (name: string, place: string): Promise<{ name: string; url: string | null; credit?: string }> =>
  req(`/v1/photos/dish?name=${encodeURIComponent(name)}&place=${encodeURIComponent(place)}`);

export type FamilyActivity = {
  name: string; note: string;
  bands: Record<string, string>;   // cohort key -> 'great'|'okay'|'skip'
  duration: string; price: number; indoor: string;
  stroller: boolean; food_onsite: boolean; booking: string; verdict: string;
};
export const getFamilyPlay = (tripId: string, regenerate = false): Promise<{ activities: FamilyActivity[]; cohorts?: string[] }> =>
  req(`/v1/trips/${tripId}/family-play?regenerate=${regenerate}`);

export type Phrase = { en: string; local: string; pron: string };
export const getPhrases = (tripId: string, regenerate = false): Promise<{ language: string; phrases: Phrase[] }> =>
  req(`/v1/trips/${tripId}/phrases?regenerate=${regenerate}`);
