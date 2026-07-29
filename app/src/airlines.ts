// Carrier hub table — deterministic transit inference. "Likely", never asserted.
type Hub = { match: string[]; iata: string; city: string; cc: string };
const HUBS: Hub[] = [
  { match: ['qatar'], iata: 'DOH', city: 'Doha', cc: 'QA' },
  { match: ['emirates'], iata: 'DXB', city: 'Dubai', cc: 'AE' },
  { match: ['etihad'], iata: 'AUH', city: 'Abu Dhabi', cc: 'AE' },
  { match: ['flydubai'], iata: 'DXB', city: 'Dubai', cc: 'AE' },
  { match: ['turkish'], iata: 'IST', city: 'Istanbul', cc: 'TR' },
  { match: ['pegasus'], iata: 'SAW', city: 'Istanbul', cc: 'TR' },
  { match: ['lufthansa'], iata: 'FRA', city: 'Frankfurt', cc: 'DE' },
  { match: ['klm'], iata: 'AMS', city: 'Amsterdam', cc: 'NL' },
  { match: ['air france'], iata: 'CDG', city: 'Paris', cc: 'FR' },
  { match: ['british'], iata: 'LHR', city: 'London', cc: 'GB' },
  { match: ['kuwait airways'], iata: 'KWI', city: 'Kuwait City', cc: 'KW' },
  { match: ['jazeera'], iata: 'KWI', city: 'Kuwait City', cc: 'KW' },
  { match: ['saudia'], iata: 'JED', city: 'Jeddah', cc: 'SA' },
  { match: ['gulf air'], iata: 'BAH', city: 'Bahrain', cc: 'BH' },
  { match: ['oman air'], iata: 'MCT', city: 'Muscat', cc: 'OM' },
  { match: ['royal jordanian'], iata: 'AMM', city: 'Amman', cc: 'JO' },
  { match: ['egyptair'], iata: 'CAI', city: 'Cairo', cc: 'EG' },
  { match: ['ethiopian'], iata: 'ADD', city: 'Addis Ababa', cc: 'ET' },
  { match: ['singapore airlines'], iata: 'SIN', city: 'Singapore', cc: 'SG' },
  { match: ['cathay'], iata: 'HKG', city: 'Hong Kong', cc: 'CN' },
];
export function transitFor(airline?: string | null, destCC?: string | null, homeCC?: string | null) {
  const a = (airline || '').toLowerCase();
  if (!a) return null;
  const hub = HUBS.find(h => h.match.some(m => a.includes(m)));
  if (!hub) return null;
  const d = (destCC || '').toUpperCase(), h = (homeCC || '').toUpperCase();
  if (hub.cc === d || (h && hub.cc === h)) return null; // hub is an endpoint, not a stop
  return hub;
}

// IATA 2-letter code → carrier + home hub. Recognition is factual (code→name,
// name→hub); the specific flight's route/time still needs a live feed.
export const AIRLINES: Record<string, { name: string; iata: string; city: string; cc: string }> = {
  EK: { name: 'Emirates', iata: 'DXB', city: 'Dubai', cc: 'AE' },
  QR: { name: 'Qatar Airways', iata: 'DOH', city: 'Doha', cc: 'QA' },
  EY: { name: 'Etihad', iata: 'AUH', city: 'Abu Dhabi', cc: 'AE' },
  FZ: { name: 'flydubai', iata: 'DXB', city: 'Dubai', cc: 'AE' },
  KU: { name: 'Kuwait Airways', iata: 'KWI', city: 'Kuwait City', cc: 'KW' },
  J9: { name: 'Jazeera Airways', iata: 'KWI', city: 'Kuwait City', cc: 'KW' },
  GF: { name: 'Gulf Air', iata: 'BAH', city: 'Manama', cc: 'BH' },
  WY: { name: 'Oman Air', iata: 'MCT', city: 'Muscat', cc: 'OM' },
  SV: { name: 'Saudia', iata: 'JED', city: 'Jeddah', cc: 'SA' },
  XY: { name: 'flynas', iata: 'RUH', city: 'Riyadh', cc: 'SA' },
  RJ: { name: 'Royal Jordanian', iata: 'AMM', city: 'Amman', cc: 'JO' },
  ME: { name: 'Middle East Airlines', iata: 'BEY', city: 'Beirut', cc: 'LB' },
  MS: { name: 'EgyptAir', iata: 'CAI', city: 'Cairo', cc: 'EG' },
  TK: { name: 'Turkish Airlines', iata: 'IST', city: 'Istanbul', cc: 'TR' },
  PC: { name: 'Pegasus', iata: 'SAW', city: 'Istanbul', cc: 'TR' },
  ET: { name: 'Ethiopian', iata: 'ADD', city: 'Addis Ababa', cc: 'ET' },
  LH: { name: 'Lufthansa', iata: 'FRA', city: 'Frankfurt', cc: 'DE' },
  LX: { name: 'SWISS', iata: 'ZRH', city: 'Zurich', cc: 'CH' },
  OS: { name: 'Austrian', iata: 'VIE', city: 'Vienna', cc: 'AT' },
  KL: { name: 'KLM', iata: 'AMS', city: 'Amsterdam', cc: 'NL' },
  AF: { name: 'Air France', iata: 'CDG', city: 'Paris', cc: 'FR' },
  BA: { name: 'British Airways', iata: 'LHR', city: 'London', cc: 'GB' },
  VS: { name: 'Virgin Atlantic', iata: 'LHR', city: 'London', cc: 'GB' },
  IB: { name: 'Iberia', iata: 'MAD', city: 'Madrid', cc: 'ES' },
  AZ: { name: 'ITA Airways', iata: 'FCO', city: 'Rome', cc: 'IT' },
  AI: { name: 'Air India', iata: 'DEL', city: 'Delhi', cc: 'IN' },
  '6E': { name: 'IndiGo', iata: 'DEL', city: 'Delhi', cc: 'IN' },
  PK: { name: 'Pakistan Intl', iata: 'ISB', city: 'Islamabad', cc: 'PK' },
  UL: { name: 'SriLankan', iata: 'CMB', city: 'Colombo', cc: 'LK' },
  TG: { name: 'Thai Airways', iata: 'BKK', city: 'Bangkok', cc: 'TH' },
  SQ: { name: 'Singapore Airlines', iata: 'SIN', city: 'Singapore', cc: 'SG' },
  MH: { name: 'Malaysia Airlines', iata: 'KUL', city: 'Kuala Lumpur', cc: 'MY' },
  CX: { name: 'Cathay Pacific', iata: 'HKG', city: 'Hong Kong', cc: 'HK' },
  CA: { name: 'Air China', iata: 'PEK', city: 'Beijing', cc: 'CN' },
  NH: { name: 'ANA', iata: 'HND', city: 'Tokyo', cc: 'JP' },
  JL: { name: 'Japan Airlines', iata: 'HND', city: 'Tokyo', cc: 'JP' },
  KE: { name: 'Korean Air', iata: 'ICN', city: 'Seoul', cc: 'KR' },
  QF: { name: 'Qantas', iata: 'SYD', city: 'Sydney', cc: 'AU' },
  AA: { name: 'American Airlines', iata: 'DFW', city: 'Dallas', cc: 'US' },
  DL: { name: 'Delta', iata: 'ATL', city: 'Atlanta', cc: 'US' },
  UA: { name: 'United', iata: 'ORD', city: 'Chicago', cc: 'US' },
  AC: { name: 'Air Canada', iata: 'YYZ', city: 'Toronto', cc: 'CA' },
};

export function airlineFromRef(ref?: string | null) {
  const r = (ref || '').trim().toUpperCase();
  if (r.length < 2) return null;
  const code = r.slice(0, 2);
  const a = AIRLINES[code];
  return a ? { code, ...a } : null;
}
