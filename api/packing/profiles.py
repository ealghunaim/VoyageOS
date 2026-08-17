"""Who is travelling, and what garments they actually wear.

Packing is a wardrobe question, not an identity one. So this models garment
CATEGORIES a traveller ticks, never a gender field — "does this person pack
dresses" is answerable and useful; inferring it from anything else is both
less accurate and not our business.

WHY IT HANGS OFF members

People pack; trips do not. A profile set once compounds across every future
trip, which is why it lives on the traveller in user_preferences.extras rather
than on a trip. It is optional throughout: no profile means exactly the
behaviour that existed before this file.

WHAT REACHES THE MODEL

Not names, and not dates of birth. A name adds nothing to packing quality, and
a birth date is real personal data going to a third party for no benefit. The
model gets a relation label and a coarse age band, which are the parts it can
actually reason with — a child packs differently from a partner.

NO PER-PERSON PACKING STYLE

Style stays a single account-level setting. Two places holding one concept is
how settings rot, and nobody has yet asked to be thorough for themselves and
light for their partner. The schema tolerates the key if an old payload
carries one; it is simply not read.
"""
from __future__ import annotations

from datetime import date

#: Garment categories. Deliberately coarse: every extra entry is another way
#: for two people to describe the same wardrobe differently, and the model does
#: not need thobe-versus-kandura to pack a suitcase.
#:
#: `accessories` earns its place because belts, watches and bags already appear
#: in generated lists. Without a home in this vocabulary they would either leak
#: past the clothing filter or vanish for anyone with a profile — a silent
#: regression for the people who took the trouble to fill this in.
WARDROBE: tuple[str, ...] = (
    "tops", "bottoms", "dresses", "skirts", "suits", "abaya_kaftan",
    "swimwear", "activewear", "sleepwear", "underwear", "outerwear",
    "headwear_scarves", "footwear", "accessories",
)

#: Starting points, not identities. Each is a pre-ticked set the traveller then
#: edits, which is why they are named for what they contain.
#:
#: swimwear and activewear are in none of them: those follow the trip, not the
#: person, and the activities already on a trip inform them better than a
#: default would.
STARTING_SETS: dict[str, tuple[str, ...]] = {
    "basics": ("tops", "bottoms", "underwear", "sleepwear", "outerwear",
               "footwear", "accessories"),
    "basics_dresses_skirts": ("tops", "bottoms", "underwear", "sleepwear",
                              "outerwear", "footwear", "accessories",
                              "dresses", "skirts"),
    "basics_tailoring": ("tops", "bottoms", "underwear", "sleepwear",
                         "outerwear", "footwear", "accessories", "suits"),
    "basics_modest": ("tops", "bottoms", "underwear", "sleepwear", "outerwear",
                      "footwear", "accessories", "abaya_kaftan",
                      "headwear_scarves"),
}

MAX_NOTE = 140


def sanitize_profile(raw) -> dict | None:
    """A stored profile, or None when there is nothing worth storing.

    None rather than an empty dict on purpose: absent and "present but empty"
    must behave identically, and the rest of the code only has to check one of
    them.
    """
    if not isinstance(raw, dict):
        return None
    wardrobe = [c for c in (raw.get("wardrobe") or []) if c in WARDROBE]
    # Deduplicate but keep the vocabulary's order, so two people who ticked the
    # same boxes produce the same JSON and therefore the same context hash.
    wardrobe = [c for c in WARDROBE if c in set(wardrobe)]
    note = raw.get("notes")
    note = note.strip()[:MAX_NOTE] if isinstance(note, str) and note.strip() else None
    if not wardrobe and not note:
        return None
    out: dict = {}
    if wardrobe:
        out["wardrobe"] = wardrobe
    if note:
        out["notes"] = note
    return out


def age_band(dob, on: date | None = None) -> str:
    """A coarse band, never the date itself.

    Unknown ages answer "adult" rather than guessing young: an adult list is
    the safer default, and a missing birthday should not quietly turn someone
    into a toddler.
    """
    if not dob:
        return "adult"
    if isinstance(dob, str):
        try:
            d = date.fromisoformat(dob)
        except ValueError:
            return "adult"
    elif isinstance(dob, date):
        d = dob
    else:
        # An int, a dict, anything else — stored data is not always what the
        # model class promised, and a wrong type must not raise here.
        return "adult"
    today = on or date.today()
    years = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
    if years < 0:
        return "adult"                      # a future birthday is data entry noise
    if years <= 3:
        return "0-3"
    if years <= 7:
        return "4-7"
    if years <= 12:
        return "8-12"
    if years <= 17:
        return "13-17"
    return "adult"


def party_block(extras: dict | None, *, on: date | None = None) -> list[dict]:
    """The `party` array the packing context carries, or [] when there is
    nothing to say.

    The owner is always first and labelled "You". Members follow in their
    stored order. A traveller with no profile still appears — their presence is
    itself information the prompt never used to have — carrying only a label
    and an age band.
    """
    extras = extras or {}
    party: list[dict] = []

    def entry(label: str, dob, profile) -> dict:
        e: dict = {"label": label, "age_band": age_band(dob, on)}
        p = sanitize_profile(profile)
        if p:
            e.update(p)
        return e

    party.append(entry("You", extras.get("dob"), extras.get("packing")))
    for m in (extras.get("members") or []):
        if not isinstance(m, dict):
            continue
        label = str(m.get("relation") or "other")
        party.append(entry(label, m.get("dob"), m.get("packing")))
    # One traveller with no profile says nothing the prompt did not already
    # assume, so it is omitted rather than sent as noise.
    if len(party) == 1 and set(party[0]) == {"label", "age_band"}:
        return []
    return party
