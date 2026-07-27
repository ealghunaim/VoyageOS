import { API_URL } from './config';

export type Trip = {
  id: string; title: string; start_date: string; end_date: string;
  trip_type?: string | null; status: string;
};
export type PackItem = {
  id: string; name: string; category: string; qty: number;
  status: 'suggested' | 'accepted' | 'packed' | 'rejected';
  reason?: string | null; source: string;
};

async function req(path: string, options: RequestInit = {}) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (e) {
    throw new Error(
      "Can't reach the VoyageOS server. Is it running with --host 0.0.0.0, and are the phone and Mac on the same Wi-Fi?"
    );
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
