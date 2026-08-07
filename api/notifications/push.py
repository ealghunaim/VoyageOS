"""Expo push: which tokens to send to, and what the response means.

Split out of the worker so the two halves that caused a bug can be tested
without a database or a network — picking tokens, and reading what Expo says
about them.

THE BUG THIS EXISTS TO PREVENT

One reminder arrived on a phone four or five times over. The schedule row was
claimed once, sent once and logged once; the fan-out was the multiplier.
device_tokens is keyed on the token, Expo mints a fresh token for every
install, and nothing ever removed the old ones — so a year of app updates left
one user holding a stack of tokens that all resolved to the same handset, and
every reminder was delivered once per token.

Two independent guards, because either alone still leaves a way to flood
someone:

  prune   Expo names dead tokens in the send response. Reading it and deleting
          them keeps the stack from growing in the first place.
  cap     Even so, never build more than MAX_DEVICES_PER_USER messages for one
          person. A backstop, not a strategy: if it ever fires, something
          upstream is wrong, which is why it logs rather than trimming quietly.
"""
from __future__ import annotations

#: Nobody legitimately notifies more than a handful of devices. Small enough
#: that a runaway is capped hard, generous enough that phone + tablet + a
#: reinstall in flight all still work.
MAX_DEVICES_PER_USER = 5

#: Expo's word for "this token is dead — the app is gone from that device".
#: The only error worth deleting a row over; the rest are transient or ours.
DEAD_TOKEN_ERROR = "DeviceNotRegistered"


def choose_tokens(rows: list[dict]) -> tuple[list[str], int]:
    """Newest first, capped. Returns (tokens, how_many_were_dropped).

    Newest wins because the current install is the one the traveller is
    actually holding; a stale row from two builds ago should be the first
    thing sacrificed if the cap ever bites.
    """
    ordered = sorted(rows, key=lambda r: str(r.get("updated_at") or ""), reverse=True)
    tokens = [r["token"] for r in ordered if r.get("token")]
    dropped = max(0, len(tokens) - MAX_DEVICES_PER_USER)
    return tokens[:MAX_DEVICES_PER_USER], dropped


def dead_tokens(sent: list[str], body: dict | None) -> list[str]:
    """Which of the tokens we just sent to are gone, per Expo's reply.

    Expo returns one ticket per message, in the order they were sent, so a
    ticket is matched to its token by index — there is no id in the error
    branch to match on instead. That makes alignment the thing most likely to
    go quietly wrong: a short, long or missing `data` array must delete
    nothing rather than delete whatever happens to line up.

        {"data": [{"status": "ok", "id": "..."},
                  {"status": "error", "message": "...",
                   "details": {"error": "DeviceNotRegistered"}}]}
    """
    tickets = (body or {}).get("data")
    if not isinstance(tickets, list):
        return []
    out: list[str] = []
    for token, ticket in zip(sent, tickets):          # zip stops at the shorter
        if not isinstance(ticket, dict):
            continue
        if ticket.get("status") != "error":
            continue
        details = ticket.get("details")
        err = details.get("error") if isinstance(details, dict) else None
        if err == DEAD_TOKEN_ERROR:
            out.append(token)
    return out
