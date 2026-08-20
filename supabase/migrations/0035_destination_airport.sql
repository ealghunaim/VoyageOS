-- 0035: destinations.airport_iata — which airport this stop is reached through
--
-- Cities with more than one airport are the normal case in the places people
-- fly to, and the guide has been picking for them implicitly. The Know and Go
-- tabs answer "getting from the airport into town", which is a different answer
-- for Narita and Haneda, for Gatwick and Heathrow, for Malpensa and Linate.
--
-- NULL MEANS "NOT CHOSEN", NOT "NONE". A null destination falls back to the
-- nearest large airport by distance — the same value the picker would show as
-- its default — so behaviour is unchanged for every existing row and for anyone
-- who never opens the picker. Storing the default eagerly would freeze today's
-- table into old trips; leaving it null lets the answer improve when the data
-- does.
--
-- THREE CHARACTERS, UNVALIDATED. No foreign key and no CHECK against a code
-- list, deliberately: the authoritative list ships in the app bundle
-- (app/src/airports.ts, regenerated from OurAirports) and is not in this
-- database. A CHECK here would be a second list to keep in step, and the one
-- that went stale would reject a code the app had just offered. The client
-- picks from a fixed list, so the value is constrained where it is chosen.
--
-- The length cap is real though: an IATA code is three characters, and a column
-- that accepts more accepts a bug.
--
-- ADDITIVE AND SAFE IN BOTH DIRECTIONS. Nullable, no default, so code that
-- does not know about it is unaffected.
alter table public.destinations
  add column if not exists airport_iata text
  check (airport_iata is null or char_length(airport_iata) = 3);
