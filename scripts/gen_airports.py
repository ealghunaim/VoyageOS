import csv, re, os, pathlib, sys

SP = os.path.dirname(os.path.abspath(__file__))
rows = [r for r in csv.DictReader(open(f"{SP}/airports.csv", encoding="utf-8"))
        if (r["iata_code"] or "").strip() and r["scheduled_service"] == "yes"]

RANK = {"large_airport": 0, "medium_airport": 1, "small_airport": 2,
        "seaplane_base": 3, "heliport": 3}
rows.sort(key=lambda r: (RANK.get(r["type"], 3), r["iata_code"]))


def clean_name(n):
    n = re.sub(r"\s+(International\s+)?Airport$", "", n.strip())
    n = re.sub(r"\s+Airfield$|\s+Airport$", "", n)
    return n.replace("|", "/").replace("`", "'").strip()


def clean_city(c):
    c = re.sub(r"\s*\(.*\)$", "", (c or "").strip())
    return c.replace("|", "/").replace("`", "'").strip()


seen, out = set(), []
for r in rows:
    code = (r["iata_code"] or "").strip().upper()
    if len(code) != 3 or code in seen:
        continue
    seen.add(code)
    out.append("|".join([code, clean_name(r["name"]), clean_city(r["municipality"]),
                         (r["iso_country"] or "").strip().upper()]))

blob = "\n".join(out)
assert "`" not in blob and "${" not in blob, "blob would break the template literal"

HEADER = '''/**
 * IATA airport table — every airport with a code and scheduled service.
 *
 * Shipped in the bundle rather than queried, for two reasons. Autocomplete
 * fires on every keystroke and AeroDataBox meters by API unit, so querying it
 * would meter typing — exactly the workload you cannot afford. And the
 * geocoder behind the wizard is a *city* database: typing "Sing" there returns
 * Singa in Sudan and Wan Sing in Myanmar long before Singapore, and it does
 * not index IATA codes at all, which is how a flight leg is actually written.
 *
 * Source: OurAirports (https://ourairports.com/data/), public domain.
 * Filtered to rows carrying an IATA code with scheduled_service = yes, then
 * sorted large airports first — that ordering is what makes a prefix search
 * surface Heathrow ahead of a regional strip.
 *
 * Stored as one delimited string rather than an array of objects: a third of
 * the size of the equivalent JSON, parsed once on first search and cached.
 */
export type Airport = { iata: string; name: string; city: string; cc: string };

const BLOB = `'''

FOOTER = '''`;

let CACHE: Airport[] | null = null;

function all(): Airport[] {
  if (CACHE) return CACHE;
  CACHE = BLOB.split('\\n').filter(Boolean).map(l => {
    const [iata, name, city, cc] = l.split('|');
    return { iata, name, city, cc };
  });
  return CACHE;
}

const startsWord = (text: string, s: string) =>
  text.split(/[\\s-]+/).some(w => w.startsWith(s));

/**
 * Rank matters more than matching. An exact IATA code is nearly always what
 * was meant, a code prefix next, then a city starting with the query, and only
 * then looser forms. Without that order "LON" surfaces obscure fields ahead of
 * London.
 *
 * Any *word* of the airport name counts as a start, so a query can reach
 * Singapore Changi through "Changi" and not only through the city.
 *
 * Equal ranks break on position in the table, which is sorted large airports
 * first — so "Sing" gives Singapore before Singkil and "LON" gives London
 * before Long Beach. Ranking those by string length instead looks reasonable
 * and is wrong: it prefers Singkil, whose name is simply shorter.
 */
export function searchAirports(q: string, limit = 6): Airport[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const list = all();
  const scored: { i: number; rank: number }[] = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const iata = a.iata.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    let rank = -1;
    if (iata === s) rank = 0;
    else if (iata.startsWith(s)) rank = 1;
    else if (city.startsWith(s)) rank = 2;
    else if (name.startsWith(s)) rank = 3;
    else if (startsWord(city, s) || startsWord(name, s)) rank = 4;
    else if (city.includes(s) || name.includes(s)) rank = 5;
    if (rank >= 0) scored.push({ i, rank });
  }
  scored.sort((x, y) => x.rank - y.rank || x.i - y.i);
  return scored.slice(0, limit).map(x => list[x.i]);
}

/** "BKK" -> "Bangkok (BKK)". Unknown codes pass through untouched. */
export function labelFor(code: string): string {
  const a = all().find(x => x.iata === code.trim().toUpperCase());
  return a ? `${a.city || a.name} (${a.iata})` : code;
}
'''

dest = pathlib.Path(sys.argv[1])
dest.write_text(HEADER + blob + FOOTER, encoding="utf-8")
print(f"  airports: {len(out)}")
print(f"  blob:     {len(blob.encode()):,} bytes ({len(blob.encode())/1024:.0f} KB)")
print(f"  file:     {dest} ({dest.stat().st_size/1024:.0f} KB)")
for c in ("BKK", "SIN", "KWI", "LHR", "HND", "CDG", "JFK"):
    print("   ", next(l for l in out if l.startswith(c + "|")))
