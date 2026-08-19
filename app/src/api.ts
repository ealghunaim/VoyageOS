import * as CFG from './config';
import { getToken, refreshSession } from './auth';
const API_URL = CFG.API_URL;
const APP_KEY: string = (CFG as any).APP_KEY ?? '';

let onAuthFail: (() => void) | null = null;
export function setAuthFailHandler(fn: () => void) { onAuthFail = fn; }

export type TripStop = { id: string; place_name: string; country_code: string | null; seq?: number };
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
  /** every stop, in seq order — list_trips attaches this so the trip list can
   *  render the same multi-country hero as the trip screen */
  destinations?: TripStop[] | null;
};
export type PackItem = {
  style_tag?: string | null; weight_g?: number | null;
  id: string; name: string; category: string; qty: number;
  status: 'suggested' | 'accepted' | 'packed' | 'rejected';
  reason?: string | null; source: string;
};

/** The structured body a 402 carries. Mirrors limit_body() on the server. */
export type LimitInfo = {
  code: string;
  tier: string; limit: number; trips_used: number;
  upgrade_to: string | null; upgrade_limit: number | null;
  upgrade_price: string | null;
  message: string;
};

/** Hitting a paid limit — thrown instead of a plain Error so a caller can
 *  open the paywall rather than show a dialog.
 *
 *  The body was being destroyed before anyone could use it: req() did
 *  `detail = j.detail || detail`, and limit_body() returns an object, so
 *  `new Error(object)` stringified to "[object Object]" — which is what a
 *  user at their trip limit actually saw. The message below is the server's
 *  own sentence, so even a caller that only shows e.message improves.
 */
export class PaywallError extends Error {
  info: LimitInfo;
  constructor(info: LimitInfo) {
    super(info.message || 'You have reached your plan limit.');
    this.name = 'PaywallError';
    this.info = info;
  }
}

/** Turn whatever `detail` holds into something a human can read.
 *
 *  FastAPI's detail is a string for most errors and an object for the
 *  structured ones. Only the string case was handled; every object arrived as
 *  "[object Object]". Ordered from most to least specific, and never returns
 *  a stringified object.
 */
function readableDetail(detail: unknown, status: number): string {
  if (typeof detail === 'string' && detail) return detail;
  if (detail && typeof detail === 'object') {
    const m = (detail as any).message;
    if (typeof m === 'string' && m) return m;
    try { return JSON.stringify(detail); } catch { /* fall through */ }
  }
  return `HTTP ${status}`;
}

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
    let body: any = null;
    try { body = await res.json(); } catch { /* not every error has a body */ }
    const detail = body?.detail;

    // 402 is the paywall, and only the paywall: the API uses it for "you have
    // reached a paid limit" and nothing else. Deliberately not 429 — see
    // trips/router.py.
    if (res.status === 402 && detail && typeof detail === 'object') {
      throw new PaywallError(detail as LimitInfo);
    }
    throw new Error(readableDetail(detail, res.status));
  }
  return res.json();
}

/** Delete this account and everything belonging to it. Irreversible.
 *
 *  The caller must have re-confirmed the password with auth.verifyPassword()
 *  first — this request carries only the session token, by design.
 */
export const deleteAccount = (): Promise<{ storage_objects_deleted: number }> =>
  req('/v1/me', { method: 'DELETE' });

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
/** What one kit item ran into on the way onto the list.
 *
 *  `already_there === merged + skipped`, and `capped` counts a SUBSET of
 *  merged rather than a third sibling — nobody should be summing three
 *  numbers to check they got them all.
 */
export type KitConflict = {
  name: string;
  action: 'merged' | 'skipped';
  from_qty?: number; added_qty?: number; to_qty?: number; capped_at?: number;
  existing_qty?: number; detail?: string;
};
export type KitApplied = {
  added: number; already_there: number; merged: number; skipped: number;
  capped: number; conflicts: KitConflict[]; kit: string;
};
export const applyKit = (id: string, tripId: string): Promise<KitApplied> =>
  req(`/v1/gear-profiles/${id}/apply/${tripId}`, { method: 'POST' });

export type WeightInfo = { total_g: number; counted: number; unweighed: number; limit_g: number | null };
export const getWeight = (tripId: string): Promise<WeightInfo> => req(`/v1/trips/${tripId}/weight`);
export const setBagLimit = (tripId: string, limit_g: number | null) =>
  req(`/v1/trips/${tripId}/bag`, { method: 'PUT', body: JSON.stringify({ limit_g }) });

export type Doc = {
  id: string; type: string; label: string | null; expiry_date: string | null;
  country_code: string | null; notes: string | null;
  /** last four digits, in clear, so a list renders without decrypting */
  number_last4: string | null;
  /** whether a number/photo exists — the values themselves never come down */
  has_number?: boolean;
  has_photo?: boolean;
  expiry: { level: string; message: string; days_left: number | null };
  /** how many renewal reminders the server scheduled for this document */
  reminders?: number;
};
export const listDocuments = (): Promise<Doc[]> => req('/v1/documents');
export const createDocument = (b: object): Promise<Doc> =>
  req('/v1/documents', { method: 'POST', body: JSON.stringify(b) });
export const patchDocument = (id: string, b: object): Promise<Doc> =>
  req(`/v1/documents/${id}`, { method: 'PATCH', body: JSON.stringify(b) });
export const deleteDocument = (id: string) =>
  req(`/v1/documents/${id}`, { method: 'DELETE' });

/** The full number, decrypted server-side. Deliberately a separate request:
 *  a list renders last4, and decrypting every row to draw a screen would mean
 *  more key use and more exposure for something nobody is reading. */
export const revealDocumentNumber = (id: string): Promise<{ id: string; number: string }> =>
  req(`/v1/documents/${id}/number`);

export const uploadDocumentPhoto = (id: string, b64: string, mime: string) =>
  req(`/v1/documents/${id}/photo`, { method: 'POST', body: JSON.stringify({ b64, mime }) });

export const deleteDocumentPhoto = (id: string) =>
  req(`/v1/documents/${id}/photo`, { method: 'DELETE' });

/**
 * The photo, as a data URI ready for <Image>.
 *
 * The endpoint streams decrypted bytes rather than returning a link, so there
 * is nothing to hand to <Image source={{uri}}> directly — a URL would be a
 * forwardable credential, which is the thing the design avoids. The bytes are
 * read here and turned into a data URI that lives only in memory.
 */
/** What the SERVER believes this user's tier is.
 *
 *  The authority, deliberately — not RevenueCat's CustomerInfo. The tier is
 *  written by the webhook, which can land after a purchase call resolves on
 *  the device, so the client asking the store "what did I just buy" and the
 *  API asking the database "what may this user do" are answering different
 *  questions. Only this one gates anything.
 */
export type Subscription = {
  tier: string; tier_label: string; limit: number; trips_used: number;
  premium_trip_used: boolean; premium_trip_id: string | null;
  status: string; renews_at: string | null;
  next_tier: { tier: string; label: string; limit: number; price: string } | null;
};

export async function getSubscription(): Promise<Subscription> {
  return req('/v1/subscription');
}

export async function getDocumentPhoto(id: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_URL}/v1/documents/${id}/photo`, {
    headers: {
      ...(APP_KEY ? { 'x-voyageos-key': APP_KEY } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

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
export const getGuidePart = (tripId: string, phase: 'a' | 'b', destinationId?: string, regenerate = false):
  Promise<{ guide: Partial<Guide>; phase: string; destination_id: string; cached: boolean; cost_usd: number }> =>
  req(`/v1/trips/${tripId}/guide/part/${phase}?regenerate=${regenerate}` +
    (destinationId ? `&destination_id=${destinationId}` : ''));

/** Which garment categories apply to one traveller. Absent means the packing
 *  generator behaves exactly as it did before profiles existed — see
 *  api/packing/profiles.py. There is deliberately no packing-style field: style
 *  stays a single account-level setting. */
export type PackingProfile = { wardrobe: string[]; notes?: string | null };

export type Companion = {
  name: string;
  relation: 'partner' | 'child' | 'parent' | 'friend' | 'other';
  dob?: string | null;
  packing?: PackingProfile | null;
};
export type HomeOrigin = { name: string; country?: string | null; lat?: number | null; lng?: number | null };
export type Profile = {
  dob: string | null; gender: string | null; nationality: string | null;
  members: Companion[] | null;
  emergency_contact?: { name: string; phone: string } | null;
  home_origin?: HomeOrigin | null;
  /** The account owner's own wardrobe profile; companions carry theirs in
   *  `members`. */
  packing?: PackingProfile | null;
};
export const getProfile = (): Promise<Profile> => req('/v1/me/profile');
export const putProfile = (b: Partial<Profile>): Promise<Profile> =>
  req('/v1/me/profile', { method: 'PUT', body: JSON.stringify(b) });

export type TripDetail = Trip & { destinations: TripStop[] };
export const getTrip = (id: string): Promise<TripDetail> => req(`/v1/trips/${id}`);
// entry_date is the day the entry is ABOUT; created_at is when it was typed.
// They differ whenever somebody writes up a day after the fact — which is most
// of the time. Optional on the type because rows written before 0029 and
// servers that predate it will not carry it.
export type Note = {
  id: string; body: string; created_at: string; entry_date?: string; photos?: string[];
};
export const listNotes = (tripId: string): Promise<Note[]> => req(`/v1/trips/${tripId}/notes`);
export const addNote = (tripId: string, body: string, photos: { b64: string; mime: string }[] = [],
                        entryDate?: string): Promise<Note> =>
  req(`/v1/trips/${tripId}/notes`, {
    method: 'POST', body: JSON.stringify({ body, photos, entry_date: entryDate }),
  });
export const patchNote = (tripId: string, noteId: string, entryDate: string): Promise<Note> =>
  req(`/v1/trips/${tripId}/notes/${noteId}`, {
    method: 'PATCH', body: JSON.stringify({ entry_date: entryDate }),
  });

export const patchTrip = (id: string, b: { title?: string; start_date?: string; end_date?: string; airline?: string; visa_status?: string; cabin_class?: string; depart_time?: string; segments?: Segment[]; with_kids?: boolean; traveler_types?: string[]; origin?: string; origin_country?: string; origin_lat?: number; origin_lng?: number }): Promise<Trip> =>
  req(`/v1/trips/${id}`, { method: 'PATCH', body: JSON.stringify(b) });
export const deleteTrip = (id: string): Promise<void> =>
  req(`/v1/trips/${id}`, { method: 'DELETE' });

export type FoodTip = {
  id: string; restaurant: string; note: string; order_rec: string; when_rec: string;
  author: string; is_mine: boolean; created_at: string; photos?: string[];
};
export type TipCategory = 'eat' | 'play' | 'visit' | 'go';
export const listFoodTips = (place: string, cc?: string | null, category: TipCategory = 'eat'): Promise<FoodTip[]> =>
  req(`/v1/food-tips?place=${encodeURIComponent(place)}${cc ? `&cc=${cc}` : ''}&category=${category}`);
export const addFoodTip = (b: { category?: TipCategory; place_name: string; country_code?: string | null; restaurant: string; note?: string; order_rec?: string; when_rec?: string; photos?: { b64: string; mime: string }[] }): Promise<FoodTip> =>
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

/** One item the parser understood, before it is committed to the list. */
export type ParsedItem = {
  name: string; category: string; qty: number; style_tag: string | null;
};

/** Something already on the list that a new item collides with. */
export type DuplicateHit = {
  name: string; qty: number;
  existing_id: string; existing_name: string; existing_qty: number;
};

export type QuickAddResult =
  | { status: 'added'; items: PackItem[] }
  /** Nothing was inserted — the traveller decides. `items` comes back so
   *  confirming costs no second model call. */
  | { status: 'needs_decision'; items: ParsedItem[]; duplicates: DuplicateHit[] };

/** Finish an add that hit a duplicate. No parsing happens here. */
export const confirmAddItems = (
  tripId: string, items: ParsedItem[], onDuplicate: 'merge' | 'add',
): Promise<{ status: string; items: PackItem[]; merged?: { name: string; qty: number }[] }> =>
  req(`/v1/trips/${tripId}/items/confirm-add`, {
    method: 'POST',
    body: JSON.stringify({ items, on_duplicate: onDuplicate }),
  });

export const quickAddItems = (tripId: string, text: string): Promise<QuickAddResult> =>
  req(`/v1/trips/${tripId}/items/quick-add`, { method: 'POST', body: JSON.stringify({ text }) });

export const askTrip = (tripId: string, question: string): Promise<{ answer: string }> =>
  req(`/v1/trips/${tripId}/ask`, { method: 'POST', body: JSON.stringify({ question }) });

export type RouteFlight = {
  number: string; airline: string | null; dest: string | null;
  depart: string | null; arrive: string | null; status: string | null;
};
/** Deliberate, explicit search — never called from a keystroke handler. */
export const searchRoute = (origin: string, dest: string, date: string): Promise<{
  origin: string; dest: string; date: string; flights: RouteFlight[];
  cached: boolean; units_spent: number; units_remaining?: number;
}> => req(`/v1/flights/route/${origin}/${dest}/${date}`);

export const lookupFlight = (number: string, date: string): Promise<{ number: string; origin: string | null; dest: string | null; depart: string | null; arrive: string | null; status: string | null }> =>
  req(`/v1/flights/${encodeURIComponent(number)}/${date}`);

/** A landmark photo sourced from Wikimedia, or null when nothing could be
 *  matched confidently. Null is a real answer — roughly a third of guide items
 *  legitimately have no publishable photo, and a placeholder would only invite
 *  a caption over the wrong picture. `title` is the article the photo actually
 *  came from and is what the UI must label it with: the match can legitimately
 *  be the containing district (Arashiyama for its bamboo grove), which is true
 *  and useful when named honestly and a false claim when not. */
export type PlacePhoto = {
  name: string; url: string; title: string; source: string;
  credit: string; license: string; license_url?: string; page?: string;
};

export const placePhotos = (
  destination_id: string, names: string[],
): Promise<Record<string, PlacePhoto | null>> =>
  req('/v1/photos/places', { method: 'POST', body: JSON.stringify({ destination_id, names }) });

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
