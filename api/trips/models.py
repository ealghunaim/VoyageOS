"""Request schemas for trip endpoints (Part 9 §1)."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class Segment(BaseModel):
    """One leg of the door-to-door journey. Times are traveler-entered ISO
    strings (a flight feed can fill these later — same shape)."""
    mode: Literal["flight", "train", "ship", "drive"] = "flight"
    ref: str | None = Field(default=None, max_length=20)      # flight no. / service name
    origin: str | None = Field(default=None, max_length=60)
    dest: str | None = Field(default=None, max_length=60)
    depart: str | None = Field(default=None, max_length=25)   # ISO datetime
    arrive: str | None = Field(default=None, max_length=25)


class TripCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    start_date: date
    end_date: date
    depart_time: str | None = Field(default=None, max_length=5)  # return flight HH:MM
    with_kids: bool = False
    trip_type: str | None = None
    travel_mode: str | None = Field(default=None, max_length=12)  # air|train|ship|car
    airline: str | None = Field(default=None, max_length=60)
    cabin_class: str | None = Field(default=None, max_length=16)
    # where the traveler sets out from — anchors Go transit advice and
    # departure-weather packing. Prefilled from the profile home, overridable.
    origin: str | None = Field(default=None, max_length=80)
    origin_country: str | None = Field(default=None, max_length=2)
    origin_lat: float | None = None
    origin_lng: float | None = None
    # party composition — any of solo/partner/adults/teens/elderly/kids.
    # Play rates activities per selected cohort; with_kids is derived from this.
    traveler_types: list[str] | None = None

    @model_validator(mode="after")
    def dates_ordered(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class DestinationCreate(BaseModel):
    place_name: str = Field(min_length=1, max_length=120)
    country_code: str | None = Field(default=None, max_length=2)
    lat: float | None = None   # from autocomplete — stored at creation, geocoding retired
    lng: float | None = None
    accommodation: dict | None = None   # {'name': ...} — tailors the guide by proximity
    seq: int = 1


class ActivityCreate(BaseModel):
    type: str = Field(min_length=1, max_length=40)   # hiking, trail_running, business, ...
    title: str | None = None


class TripPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    start_date: date | None = None
    end_date: date | None = None
    travel_mode: str | None = Field(default=None, max_length=12)
    airline: str | None = Field(default=None, max_length=60)
    visa_status: str | None = Field(default=None, max_length=16)  # none|evisa|arrival|required
    cabin_class: str | None = Field(default=None, max_length=16)
    depart_time: str | None = Field(default=None, max_length=5)
    segments: list[Segment] | None = None
    with_kids: bool | None = None
    origin: str | None = Field(default=None, max_length=80)
    origin_country: str | None = Field(default=None, max_length=2)
    origin_lat: float | None = None
    origin_lng: float | None = None
    traveler_types: list[str] | None = None
