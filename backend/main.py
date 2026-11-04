import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("aitinerary")

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ai.orchestrator import orchestrate
from backend.models import BudgetSummary, DayPlan, Itinerary, Risk, Stop, TransportLeg, TripBrief
from backend.auth import (
    authenticate_user,
    create_password_reset,
    create_session,
    create_user,
    delete_saved_trip,
    get_user_for_token,
    list_saved_trips,
    refresh_session,
    reset_password,
    revoke_session,
    save_trip,
    verify_email_token,
)
from backend.countries import country_for_region, get_country, list_countries
from backend.regions import get_destination_snapshot, get_region_profile, get_stop_profile

load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(title="AITinerary API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REGION_CONFIG = {
    "manila": {"name": "Metro Manila", "rainy_months": ["June", "July", "August", "September"]},
    "cebu": {"name": "Cebu", "rainy_months": ["June", "July", "August", "September"]},
    "palawan": {"name": "Palawan", "rainy_months": ["June", "July", "August", "September", "October"]},
    "tokyo": {"name": "Tokyo", "rainy_months": ["June", "July", "September"]},
    "singapore": {"name": "Singapore", "rainy_months": ["November", "December", "January"]},
}


def _area_and_cost(region: str, stop_name: str):
    stop_profile = get_stop_profile(region, stop_name)
    return (
        stop_profile["area"],
        stop_profile["category"],
        stop_profile["cost"],
        stop_profile.get("latitude"),
        stop_profile.get("longitude"),
    )


@app.middleware("http")
async def log_requests(request, call_next):
    started = time.time()
    response = await call_next(request)
    logger.info(
        "%s %s -> %s (%.0fms)",
        request.method,
        request.url.path,
        response.status_code,
        (time.time() - started) * 1000,
    )
    return response


@app.get("/health")
def health():
    return {"ok": True, "service": "aitinerary-backend", "version": "1.0.0"}


@app.post("/trip/generate", response_model=Itinerary)
def generate_trip(brief: TripBrief):
    region = REGION_CONFIG.get(brief.region, REGION_CONFIG["cebu"])
    country = brief.country or country_for_region(brief.region)
    draft = orchestrate(brief)
    days: List[DayPlan] = []

    for item in draft["draft_days"]:
        area, category, cost, lat, lon = _area_and_cost(brief.region, item.stops[0])
        stop_a = Stop(
            name=item.stops[0],
            area=area,
            start_time="09:00",
            end_time="11:00",
            category=category,
            cost=cost,
            notes="Fit for a relaxed morning route.",
            latitude=lat,
            longitude=lon,
        )

        area_b, category_b, cost_b, lat_b, lon_b = _area_and_cost(brief.region, item.stops[1])
        stop_b = Stop(
            name=item.stops[1],
            area=area_b,
            start_time="12:00",
            end_time="14:00",
            category=category_b,
            cost=cost_b,
            notes="Budget-friendly local dining.",
            latitude=lat_b,
            longitude=lon_b,
        )

        legs = []
        for leg in draft["logistics"]:
            if leg["day"] == item.day:
                legs = [
                    TransportLeg(
                        from_location=leg["legs"][0]["from"],
                        to_location=leg["legs"][0]["to"],
                        mode=leg["legs"][0]["mode"],
                        eta_minutes=leg["legs"][0]["eta_minutes"],
                        fare=leg["legs"][0]["fare"],
                    ),
                    TransportLeg(
                        from_location=leg["legs"][1]["from"],
                        to_location=leg["legs"][1]["to"],
                        mode=leg["legs"][1]["mode"],
                        eta_minutes=leg["legs"][1]["eta_minutes"],
                        fare=leg["legs"][1]["fare"],
                    ),
                ]
                break

        days.append(
            DayPlan(
                day=item.day,
                date_label=f"Day {item.day}",
                theme=item.theme,
                risk=Risk(
                    level=item.risk_level,
                    summary=item.risk_summary,
                ),
                stops=[stop_a, stop_b],
                transport=legs,
                total_cost=stop_a.cost + stop_b.cost + sum(leg.fare for leg in legs),
                backup_plan=item.backup_plan,
            )
        )

    budget_summary = draft["budget"]
    total = budget_summary["total"]

    return Itinerary(
        trip_id=f"trip_{brief.destination.lower().replace(' ', '_')}_{brief.days}",
        destination=brief.destination,
        region=region["name"],
        country=country,
        generated_at="2026-11-01T00:00:00Z",
        summary=f"A {brief.pace}-paced {brief.destination} itinerary planned around realistic local movement and a {brief.travelers} travel profile.",
        total_budget=brief.budget,
        remaining_budget=max(brief.budget - total, 0),
        budget_summary=BudgetSummary(
            accommodation=budget_summary["accommodation"],
            food=budget_summary["food"],
            activities=budget_summary["activities"],
            transport=budget_summary["transport"],
            total=budget_summary["total"],
        ),
        days=days,
        reasoning=[
            "The planner chose a realistic pace to avoid unrealistic stacking of activities.",
            "Transport legs are tuned to local travel behavior rather than idealized direct routes.",
            "Risk review marks rainy-season outdoor blocks with proper caution.",
            "The budget agent keeps the trip inside the requested financial envelope.",
        ],
    )


MAP_CONFIG = {
    "google_maps_enabled": bool(os.getenv("GOOGLE_MAPS_API_KEY")) and (os.getenv("MAP_PROVIDER", "openstreetmap") or "openstreetmap").lower() == "google",
    "map_provider": (os.getenv("MAP_PROVIDER", "openstreetmap") or "openstreetmap").lower(),
    "free_mode": ((os.getenv("MAP_PROVIDER", "openstreetmap") or "openstreetmap").lower() in {"openstreetmap", "openfreemap", "osm"}),
    "default_map_style": os.getenv("MAP_STYLE", "default"),
    "places_endpoint": os.getenv("GOOGLE_MAPS_PLACES_ENDPOINT", "https://maps.googleapis.com/maps/api/place"),
}


@app.get("/maps/config")
def get_maps_config():
    return {
        "google_maps_enabled": MAP_CONFIG["google_maps_enabled"],
        "map_provider": MAP_CONFIG["map_provider"],
        "free_mode": MAP_CONFIG["free_mode"],
        "default_map_style": MAP_CONFIG["default_map_style"],
        "places_endpoint": MAP_CONFIG["places_endpoint"],
    }


@app.get("/countries")
def get_countries():
    return {"countries": list_countries()}


@app.get("/countries/{country_name}")
def get_country_detail(country_name: str):
    country = get_country(country_name)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found.")
    return country


def _bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip()


def _require_user(authorization: Optional[str]):
    user = get_user_for_token(_bearer_token(authorization) or "")
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


RATE_LIMIT_BUCKETS: Dict[str, list] = {}


def rate_limit(key: str, limit: int = 5, window_seconds: int = 300) -> None:
    now = time.time()
    bucket = RATE_LIMIT_BUCKETS.setdefault(key, [])
    bucket[:] = [stamp for stamp in bucket if now - stamp < window_seconds]
    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    bucket.append(now)


@app.post("/auth/signup")
def signup(payload: Dict[str, Any]):
    name = str(payload.get("name") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    rate_limit(f"signup:{email}")
    try:
        user = create_user(name, email, password)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    token = create_session(user["id"])
    return {"token": token, "user": user, "verification_token": user.get("verification_token")}


@app.post("/auth/login")
def login(payload: Dict[str, Any]):
    email = str(payload.get("email") or "").strip().lower()
    password = str(payload.get("password") or "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    rate_limit(f"login:{email}")
    user = authenticate_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_session(user["id"])
    return {"token": token, "user": user}


@app.post("/auth/logout")
def logout(authorization: Optional[str] = Header(default=None, alias="Authorization")):
    token = _bearer_token(authorization)
    if token:
        revoke_session(token)
    return {"ok": True}


@app.get("/auth/me")
def me(authorization: Optional[str] = Header(default=None, alias="Authorization")):
    user = _require_user(authorization)
    return {"user": user}


@app.get("/trips/saved")
def get_saved_trips(authorization: Optional[str] = Header(default=None, alias="Authorization")):
    user = _require_user(authorization)
    return {"trips": list_saved_trips(user["id"])}


@app.post("/trips/saved")
def create_saved_trip(payload: Dict[str, Any], authorization: Optional[str] = Header(default=None, alias="Authorization")):
    user = _require_user(authorization)
    itinerary = payload.get("itinerary", payload)
    if not isinstance(itinerary, dict) or not isinstance(itinerary.get("days"), list):
        raise HTTPException(status_code=400, detail="A valid itinerary is required.")
    saved = save_trip(user["id"], itinerary)
    return saved


@app.delete("/trips/saved/{trip_id}")
def remove_saved_trip(trip_id: int, authorization: Optional[str] = Header(default=None, alias="Authorization")):
    user = _require_user(authorization)
    if not delete_saved_trip(user["id"], trip_id):
        raise HTTPException(status_code=404, detail="Saved trip not found.")
    return {"ok": True}


@app.post("/auth/verify-email")
def verify_email(payload: Dict[str, Any]):
    token = str(payload.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Verification token is required.")
    user = verify_email_token(token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token.")
    return {"ok": True, "user": user}


@app.post("/auth/forgot-password")
def forgot_password(payload: Dict[str, Any]):
    email = str(payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    rate_limit(f"forgot:{email}")
    token = create_password_reset(email)
    # In production this token would be emailed, never returned.
    return {"ok": True, "reset_token": token}


@app.post("/auth/reset-password")
def reset_password_endpoint(payload: Dict[str, Any]):
    token = str(payload.get("token") or "").strip()
    new_password = str(payload.get("new_password") or "")
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password are required.")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if not reset_password(token, new_password):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    return {"ok": True}


@app.post("/auth/refresh")
def refresh(payload: Dict[str, Any]):
    old_token = str(payload.get("token") or "").strip()
    if not old_token:
        raise HTTPException(status_code=400, detail="Token is required.")
    new_token = refresh_session(old_token)
    if not new_token:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return {"token": new_token}


@app.get("/regions/{region_name}/snapshot")
def get_region_snapshot(region_name: str):
    snapshot = get_destination_snapshot(region_name)
    return {
        "region": region_name,
        **snapshot,
    }


def _guess_region_from_destination(text: str):
    lower = text.lower()
    if "palawan" in lower:
        return "palawan", "Palawan"
    if "manila" in lower or "metro manila" in lower or "quezon city" in lower:
        return "manila", "Metro Manila"
    if "cebu" in lower or "cebu city" in lower:
        return "cebu", "Cebu"
    return "cebu", "Cebu"


def _extract_month(prompt: str):
    month_map = {
        "january": "January", "february": "February", "march": "March", "april": "April",
        "may": "May", "june": "June", "july": "July", "august": "August",
        "september": "September", "october": "October", "november": "November", "december": "December",
    }
    lowered = prompt.lower()
    for key, value in month_map.items():
        if key in lowered:
            return value
    return None


def _extract_budget(prompt: str):
    match = re.search(r"(?:php|₱|peso|budget|spend|for)\s*(\d+(?:,\d{3})*(?:\.\d+)?)", prompt, re.IGNORECASE)
    if not match:
        match = re.search(r"(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|kphp|thousand)", prompt, re.IGNORECASE)
        if not match:
            return 20000.0
        value = float(match.group(1).replace(",", "")) * 1000
        return value
    return float(match.group(1).replace(",", ""))


def _extract_days(prompt: str):
    match = re.search(r"(\d+)\s*(?:day|days)", prompt, re.IGNORECASE)
    if match:
        return max(1, min(30, int(match.group(1))))
    return 4


def _extract_travelers(prompt: str):
    lowered = prompt.lower()
    if "family" in lowered or "with kids" in lowered:
        return "family"
    if "friends" in lowered or "group" in lowered:
        return "friends"
    if "couple" in lowered or "two people" in lowered or "2 people" in lowered:
        return "couple"
    return "solo"


def _extract_pace(prompt: str):
    lowered = prompt.lower()
    if "relaxed" in lowered or "slow" in lowered:
        return "relaxed"
    if "packed" in lowered or "busy" in lowered or "full" in lowered:
        return "packed"
    return "balanced"


def _extract_interests(prompt: str):
    lowered = prompt.lower()
    interests = []
    if any(word in lowered for word in ["beach", "island", "reef", "coast", "sand"]):
        interests.append("beaches")
    if any(word in lowered for word in ["food", "eat", "dining", "restaurant", "street food", "market"]):
        interests.append("local food")
    if any(word in lowered for word in ["history", "heritage", "culture", "museum", "old city"]):
        interests.append("history")
    if any(word in lowered for word in ["nature", "hike", "waterfall", "sunset", "scenic"]):
        interests.append("nature")
    if "night" in lowered or "nightlife" in lowered:
        interests.append("nightlife")
    if not interests:
        interests = ["beaches", "local food"]
    return interests


def _trip_brief_from_prompt(prompt: str) -> TripBrief:
    destination_text = prompt.strip() or "Plan a Cebu trip"
    region, destination = _guess_region_from_destination(destination_text)
    month = _extract_month(destination_text)
    brief = TripBrief(
        destination=destination,
        region=region,
        days=_extract_days(destination_text),
        budget=_extract_budget(destination_text),
        interests=_extract_interests(destination_text),
        pace=_extract_pace(destination_text),
        travelers=_extract_travelers(destination_text),
        month=month,
        notes=destination_text,
    )
    return brief


@app.post("/chat/plan")
def chat_plan(payload: dict):
    prompt = (payload or {}).get("prompt") or (payload or {}).get("message") or ""
    if not prompt or not str(prompt).strip():
        raise HTTPException(status_code=400, detail="Please provide a trip prompt.")

    brief = _trip_brief_from_prompt(str(prompt))
    itinerary = generate_trip(brief)
    return {
        "reply": f"Here’s a {brief.days}-day {brief.destination} plan tuned for {brief.travelers} travelers with a {brief.pace} pace.",
        "itinerary": itinerary,
    }
