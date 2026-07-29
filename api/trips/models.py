"""Request schemas for trip endpoints (Part 9 §1)."""
from datetime import date
from pydantic import BaseModel, Field, model_validator


class TripCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    start_date: date
    end_date: date
    depart_time: str | None = Field(default=None, max_length=5)  # return flight HH:MM
    trip_type: str | None = None
    travel_mode: str | None = Field(default=None, max_length=12)  # air|train|ship|car
    airline: str | None = Field(default=None, max_length=60)
    cabin_class: str | None = Field(default=None, max_length=16)

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
