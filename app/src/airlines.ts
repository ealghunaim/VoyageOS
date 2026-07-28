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
