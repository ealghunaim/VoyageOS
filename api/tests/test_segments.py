from api.trips.models import TripPatch


def test_trippatch_accepts_segments():
    p = TripPatch(segments=[{"mode": "flight", "ref": "QR128", "origin": "KWI",
                             "dest": "DOH", "depart": "2026-08-10T02:15", "arrive": "2026-08-10T02:55"}])
    dumped = p.model_dump(mode="json", exclude_none=True)
    assert dumped["segments"][0]["ref"] == "QR128"
    assert TripPatch().model_dump(exclude_none=True) == {}  # nothing sent → no-op
