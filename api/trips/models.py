"""Request schemas for trip endpoints (Part 9 §1)."""
from datetime import date
from pydantic import BaseModel, Field, model_validator


class TripCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    start_date: date
    end_date: date
    trip_type: str | None = None

    @model_validator(mode="after")
    def dates_ordered(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class DestinationCreate(BaseModel):
    place_name: str = Field(min_length=1, max_length=120)
    country_code: str | None = Field(default=None, max_length=2)
    seq: int = 1


class ActivityCreate(BaseModel):
    type: str = Field(min_length=1, max_length=40)   # hiking, trail_running, business, ...
    title: str | None = None
