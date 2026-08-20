"""Regenerate src/airports.ts from OurAirports.

    python3 app/scripts/build_airports.py <airports.csv> > app/src/airports.ts

Kept in the repo so the table can be rebuilt rather than hand-edited. A
generated file that nobody can regenerate becomes a hand-edited file the first
time it is wrong.

WHY COORDINATES WERE ADDED

The previous table was iata|name|city|cc, and "which airports serve this
destination" was answerable only by matching city NAMES. That fails in exactly
the cases a traveller would notice: Tokyo grouped to HND alone because Narita's
municipality is Narita; Milan did not group at all because MXP, LIN and BGY
carry three different municipalities; London missed Stansted and Luton for the
same reason; and New York gained JRA, a HELIPORT, plus two seaplane bases.

Coordinates make the question a distance test, which is what it always was.

WHY type IS FILTERED

Restricting to large_ and medium_airport is what removes the heliports and
seaplane bases. `scheduled_service = yes` alone does not: JRA had scheduled
service and is still a helipad on a pier.
"""
import csv
import datetime
import sys

KEEP_TYPES = {"large_airport", "medium_airport"}

#: Business-aviation fields the source cannot distinguish from passenger ones.
#:
#: OurAirports marks Le Bourget as large_airport / scheduled_service=yes —
#: byte-for-byte the same classification as CDG and ORY. There is no column
#: that says "you cannot book a seat here". Left in, LBG becomes the DEFAULT
#: for Paris on distance, and that default feeds the Know and Go tabs' transit
#: guidance.
#:
#: A hand-maintained list is exactly what this codebase has been unpicking
#: elsewhere, and it is used here for one reason: an EXCLUSION list fails safe.
#: If it goes stale the worst case is an extra row in a picker the traveller
#: can see and ignore. A curated INCLUSION list fails silently, by omission,
#: which is how the old city-name grouping lost Narita.
#:
#: Each entry needs a reason. "Looks obscure" is not one.
BIZ_AVIATION = {
    "LBG",   # Paris-Le Bourget — business aviation and the air show; no seats
    "TEB",   # Teterboro, NJ — business aviation, no scheduled passenger service
}


def main(path: str) -> None:
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["type"] not in KEEP_TYPES:
                continue
            if r["scheduled_service"] != "yes":
                continue
            if (r["iata_code"] or "").strip().upper() in BIZ_AVIATION:
                continue
            iata = (r["iata_code"] or "").strip().upper()
            if len(iata) != 3:
                continue
            try:
                lat = round(float(r["latitude_deg"]), 2)
                lng = round(float(r["longitude_deg"]), 2)
            except (TypeError, ValueError):
                continue                      # no position: not usable here
            name = (r["name"] or "").replace("|", " ").strip()
            # Municipality is blank for ~1% of rows. The airport name is the
            # honest fallback — better a repeated name than an empty column
            # that groups 35 unrelated airports under "".
            city = (r["municipality"] or "").replace("|", " ").strip() or name
            cc = (r["iso_country"] or "").strip().upper()
            if not (name and cc):
                continue
            # Size is kept as a single flag. A 100km radius alone is too
            # generous for a picker: New York returns eight airports including
            # Teterboro, and Milan reaches Lugano in another country. Ranking
            # large-first is what makes the list read like the choice a
            # traveller actually has.
            big = "1" if r["type"] == "large_airport" else "0"
            rows.append((r["type"], iata, name, city, cc, lat, lng, big))

    # Large airports first, so a prefix search surfaces Heathrow before a
    # regional strip — the ordering the old table relied on, preserved.
    rows.sort(key=lambda x: (0 if x[0] == "large_airport" else 1, x[1]))

    today = datetime.date.today().isoformat()
    print(f'''/**
 * IATA airport table — every large/medium airport with scheduled service.
 *
 * GENERATED. Do not hand-edit — rebuild instead:
 *
 *     curl -sS -o /tmp/airports.csv \\
 *       https://davidmegginson.github.io/ourairports-data/airports.csv
 *     python3 app/scripts/build_airports.py /tmp/airports.csv > app/src/airports.ts
 *
 * Source: OurAirports (https://ourairports.com/data/), public domain.
 * Snapshot taken {today}.
 *
 * Shipped in the bundle rather than queried, for two reasons. Autocomplete
 * fires on every keystroke and AeroDataBox meters by API unit, so querying it
 * would meter typing — exactly the workload you cannot afford. And the
 * geocoder behind the wizard is a *city* database: typing "Sing" there returns
 * Singa in Sudan and Wan Sing in Myanmar long before Singapore, and it does
 * not index IATA codes at all, which is how a flight leg is actually written.
 *
 * COORDINATES, at 2dp. "Which airports serve this destination" is a distance
 * question, and it used to be answered by matching city names — which grouped
 * Tokyo to HND alone, missed Milan entirely, and offered New York a heliport.
 * 2dp is ~1.1km, three orders of magnitude finer than the ~100km radius it is
 * asked about, and 16KB smaller than 4dp.
 *
 * Filtered to type large_airport/medium_airport with scheduled_service=yes.
 * The type filter is what removes helipads and seaplane bases; scheduled
 * service alone does not — JRA carried scheduled service and is a helipad.
 *
 * Stored as one delimited string rather than an array of objects: far smaller
 * than the equivalent JSON, parsed once on first search and cached.
 */
export type Airport = {{
  iata: string; name: string; city: string; cc: string;
  lat: number; lng: number;
  /** true for OurAirports' large_airport. Used to rank a picker, not to filter:
   *  Luton is medium and nobody would accept a London list without it. */
  large: boolean;
}};

const BLOB = `\\''')
    for _t, iata, name, city, cc, lat, lng, big in rows:
        print(f"{iata}|{name}|{city}|{cc}|{lat}|{lng}|{big}")
    print("`;")
    print(f"\n// {len(rows)} airports", file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1])
