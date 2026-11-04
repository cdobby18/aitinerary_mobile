from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class TripBrief(BaseModel):
    destination: str = Field(..., min_length=1)
    region: str = "cebu"
    country: str = "Philippines"
    days: int = Field(..., ge=1, le=30)
    budget: float = Field(..., ge=0)
    interests: List[str] = []
    pace: Literal["relaxed", "balanced", "packed"] = "balanced"
    travelers: Literal["solo", "couple", "family", "friends"] = "solo"
    month: Optional[str] = None
    notes: Optional[str] = None


class TransportLeg(BaseModel):
    from_location: str
    to_location: str
    mode: str
    eta_minutes: int
    fare: float
    note: Optional[str] = None


class Stop(BaseModel):
    name: str
    area: str
    start_time: str
    end_time: str
    category: str
    cost: float
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    hours: Optional[str] = None
    duration_minutes: Optional[int] = None
    insider_tip: Optional[str] = None
    currency: Optional[str] = None


class Risk(BaseModel):
    level: Literal["low", "moderate", "high"]
    summary: str


class DayPlan(BaseModel):
    day: int
    date_label: str
    theme: str
    risk: Risk
    stops: List[Stop]
    transport: List[TransportLeg]
    total_cost: float
    backup_plan: Optional[str] = None


class BudgetSummary(BaseModel):
    accommodation: float
    food: float
    activities: float
    transport: float
    total: float


class Itinerary(BaseModel):
    trip_id: str
    destination: str
    region: str
    country: str = "Philippines"
    generated_at: str
    summary: str
    total_budget: float
    remaining_budget: float
    budget_summary: BudgetSummary
    days: List[DayPlan]
    reasoning: List[str]
