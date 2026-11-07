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
    create_notification,
    create_password_reset,
    create_session,
    create_user,
    delete_saved_trip,
    get_user_for_token,
    list_notifications,
    list_saved_trips,
    mark_notifications_read,
    unread_notification_count,
    refresh_session,
    reset_password,
    revoke_session,
    save_trip,
    verify_email_token,
)
from backend.email import send_email
from backend.countries import country_for_region, get_country, list_countries
from backend.destinations import featured_destinations, search_destinations
from backend.regions import get_destination_snapshot, get_region_profile, get_stop_profile
from backend.weather import get_weather as get_weather_data
from backend.tours import best_tour_anywhere, chat_tour_answer, curated_catalog, enrich_stop

# Cross-region hints so the chatbot can attribute places to their destination.
REGION_KEYS_HINTS = {
    "manila": [("intramuros", "Metro Manila"), ("binondo", "Metro Manila"), ("quiapo", "Metro Manila")],
    "cebu": [("mactan", "Cebu"), ("cebu", "Cebu"), ("sirao", "Cebu"), ("carbon market", "Cebu")],
    "palawan": [("coron", "Palawan"), ("el nido", "Palawan"), ("puerto princesa", "Palawan"), ("honda bay", "Palawan"), ("nacpan", "Palawan")],
    "tokyo": [("tokyo", "Tokyo"), ("tsukiji", "Tokyo"), ("shibuya", "Tokyo"), ("shinjuku", "Tokyo"), ("asakusa", "Tokyo"), ("sensoji", "Tokyo"), ("meiji", "Tokyo")],
    "singapore": [("singapore", "Singapore"), ("marina bay", "Singapore"), ("supertree", "Singapore"), ("maxwell", "Singapore"), ("haji lane", "Singapore"), ("orchard", "Singapore"), ("little india", "Singapore")],
}

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
    "bohol": {"name": "Bohol", "rainy_months": ["June", "July", "August", "September"]},
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
        tour_a = enrich_stop(brief.region, item.stops[0])
        if tour_a:
            cost = tour_a["fee"]
            lat = tour_a["latitude"]
            lon = tour_a["longitude"]
        stop_a = Stop(
            name=item.stops[0],
            area=area,
            start_time="09:00",
            end_time="11:00",
            category=category,
            cost=cost,
            notes=(tour_a.get("description") if tour_a else "Fit for a relaxed morning route."),
            latitude=lat,
            longitude=lon,
            hours=tour_a.get("hours") if tour_a else None,
            duration_minutes=tour_a.get("duration_min") if tour_a else None,
            insider_tip=tour_a.get("insider_tip") if tour_a else None,
            currency=tour_a.get("currency") if tour_a else None,
        )

        area_b, category_b, cost_b, lat_b, lon_b = _area_and_cost(brief.region, item.stops[1])
        tour_b = enrich_stop(brief.region, item.stops[1])
        if tour_b:
            cost_b = tour_b["fee"]
            lat_b = tour_b["latitude"]
            lon_b = tour_b["longitude"]
        stop_b = Stop(
            name=item.stops[1],
            area=area_b,
            start_time="12:00",
            end_time="14:00",
            category=category_b,
            cost=cost_b,
            notes=(tour_b.get("description") if tour_b else "Budget-friendly local dining."),
            latitude=lat_b,
            longitude=lon_b,
            hours=tour_b.get("hours") if tour_b else None,
            duration_minutes=tour_b.get("duration_min") if tour_b else None,
            insider_tip=tour_b.get("insider_tip") if tour_b else None,
            currency=tour_b.get("currency") if tour_b else None,
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


@app.get("/tours/{region}")
def get_tours(region: str):
    key = region.lower()
    if key not in REGION_CONFIG:
        raise HTTPException(status_code=404, detail="Unknown destination.")
    catalog = curated_catalog(key)
    if not catalog:
        raise HTTPException(status_code=404, detail="No curated tours for this destination yet.")
    return {
        "region": key,
        "destination": REGION_CONFIG[key]["name"],
        "tours": catalog,
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


@app.get("/destinations/featured")
def destinations_featured():
    """Curated destination feed for the Home carousel / Explore screen."""
    return {"destinations": featured_destinations()}


@app.get("/destinations/search")
def destinations_search(q: str = ""):
    """Destination suggestions for the hero search and Explore screen.

    Only searches regions the planner can actually build — no invented places.
    """
    results = search_destinations(q)
    if not results:
        raise HTTPException(
            status_code=404,
            detail="That destination is not in the beta yet.",
        )
    return {"query": q, "destinations": results}


@app.get("/weather/{region}")
def weather_for_region(region: str, month: Optional[str] = None):
    """Shared weather source: live Open-Meteo for trips happening now,
    clearly-labeled seasonal estimates otherwise. Never fake live data."""
    return get_weather_data(region, month)


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
    create_notification(
        user["id"],
        "welcome",
        "Welcome to AITinerary",
        "Start with a destination, and we will shape the route around your budget and pace.",
    )
    verification_token = user.get("verification_token")
    email_sent = send_email(
        email,
        "Verify your AITinerary account",
        f"Welcome to AITinerary! Verify your account with this token: {verification_token}",
    )
    response = {"token": token, "user": user}
    if not email_sent:
        response["verification_token"] = verification_token
    return response


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


@app.get("/notifications")
def notifications_list(authorization: Optional[str] = Header(default=None, alias="Authorization")):
    user = _require_user(authorization)
    return {
        "notifications": list_notifications(user["id"]),
        "unread": unread_notification_count(user["id"]),
    }


@app.post("/notifications/read")
def notifications_mark_read(authorization: Optional[str] = Header(default=None, alias="Authorization")):
    user = _require_user(authorization)
    updated = mark_notifications_read(user["id"])
    return {"ok": True, "updated": updated}


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
    email_sent = False
    if token:
        email_sent = send_email(
            email,
            "Reset your AITinerary password",
            f"Reset your password with this token: {token}",
        )
    response = {"ok": True}
    if token and not email_sent:
        response["reset_token"] = token
    return response


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
    if "tokyo" in lower or "asakusa" in lower or "shibuya" in lower or "shinjuku" in lower:
        return "tokyo", "Tokyo"
    if "singapore" in lower or "marina bay" in lower or "supertree" in lower:
        return "singapore", "Singapore"
    if "palawan" in lower or "coron" in lower or "el nido" in lower:
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


def _extract_budget(prompt: str) -> Optional[float]:
    match = re.search(r"(?:php|₱|peso|budget|spend|for)\s*(\d+(?:,\d{3})*(?:\.\d+)?)", prompt, re.IGNORECASE)
    if not match:
        match = re.search(r"(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|kphp|thousand)\b", prompt, re.IGNORECASE)
        if not match:
            return None
        return float(match.group(1).replace(",", "")) * 1000
    return float(match.group(1).replace(",", ""))


def _extract_days(prompt: str) -> Optional[int]:
    match = re.search(r"(\d+)\s*(?:day|days)", prompt, re.IGNORECASE)
    if match:
        return max(1, min(30, int(match.group(1))))
    return None


def _extract_travelers(prompt: str) -> Optional[str]:
    lowered = prompt.lower()
    if "family" in lowered or "with kids" in lowered:
        return "family"
    if "friends" in lowered or "group" in lowered:
        return "friends"
    if "couple" in lowered or "two people" in lowered or "2 people" in lowered:
        return "couple"
    if any(word in lowered for word in ["solo", "alone", "myself", "by myself", "just me"]):
        return "solo"
    return None


def _extract_pace(prompt: str) -> Optional[str]:
    lowered = prompt.lower()
    if "relaxed" in lowered or "slow" in lowered:
        return "relaxed"
    if "packed" in lowered or "busy" in lowered or "full" in lowered:
        return "packed"
    if "balanced" in lowered:
        return "balanced"
    return None


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


def _guess_message_region(message: str):
    """Determine which region a chat message refers to (or None)."""
    lowered = message.lower()
    for region_key in REGION_CONFIG:
        if region_key in lowered or REGION_CONFIG[region_key]["name"].lower() in lowered:
            return region_key
    for region_key, hints in REGION_KEYS_HINTS.items():
        for keyword, _display in hints:
            if keyword in lowered:
                return region_key
    return None


def _trip_brief_from_prompt(prompt: str, context: Optional[dict] = None) -> TripBrief:
    """Build a TripBrief from a chat message, falling back to the active
    trip context so follow-ups like "make it 5 days" keep working."""
    context = context or {}
    destination_text = prompt.strip()

    region, destination = _guess_region_from_destination(destination_text)
    if region == "cebu" and destination == "Cebu" and context.get("region"):
        # No explicit destination detected in the message; continue the
        # conversation in the region already on screen.
        region = context["region"]
        destination = context.get("destination") or REGION_CONFIG[region]["name"]

    region = _guess_message_region(destination_text) or region

    days = _extract_days(destination_text)
    if days is None:
        days = int(context.get("days") or 4)
    budget = _extract_budget(destination_text)
    if budget is None:
        budget = float(context.get("budget") or 20000)
    interests = _extract_interests(destination_text)
    if interests == ["beaches", "local food"] and context.get("interests"):
        interests = list(context["interests"])
    pace = _extract_pace(destination_text)
    if pace == "balanced" and context.get("pace"):
        pace = context["pace"]
    travelers = _extract_travelers(destination_text)
    if travelers == "solo" and context.get("travelers"):
        travelers = context["travelers"]
    month = _extract_month(destination_text) or context.get("month")

    brief = TripBrief(
        destination=destination,
        region=region,
        days=days or 4,
        budget=budget if budget is not None else 20000.0,
        interests=interests,
        pace=pace or "balanced",
        travelers=travelers or "solo",
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


def _currency_for(region_key: str) -> str:
    return {"tokyo": "¥", "singapore": "S$"}.get(region_key, "₱")


def _fmt(region_key: str, value: float) -> str:
    prefix = _currency_for(region_key)
    return f"{prefix}{value:,.0f}"


def _budget_estimate_text(region_key: str, days: int, travelers: str) -> str:
    """Run the real budget agent for a hypothetical trip and summarize it."""
    from ai.orchestrator import budget_agent

    class _MiniBrief:
        pass

    brief = _MiniBrief()
    brief.region = region_key
    brief.days = days
    brief.travelers = travelers
    summary = budget_agent(list(range(days)), brief)
    parts = [
        f"{_fmt(region_key, summary['accommodation'])} stays",
        f"{_fmt(region_key, summary['food'])} food",
        f"{_fmt(region_key, summary['activities'])} activities",
        f"{_fmt(region_key, summary['transport'])} transport",
    ]
    total = " + ".join(parts)
    return (
        f"I ran the budget agent: {days} day(s) in {REGION_CONFIG[region_key]['name']} for a "
        f"{travelers} traveler profile. {total} — about {_fmt(region_key, summary['total'])} all-in."
    )


def _best_time_text(region_key: str) -> str:
    rainy = set(REGION_CONFIG[region_key].get("rainy_months") or [])
    month_list = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]
    good = [m for m in month_list if m not in rainy]
    return (
        f"Best months for {REGION_CONFIG[region_key]['name']}: {', '.join(good[:5])}. "
        f"Expect heavier rain around {', '.join(sorted(rainy)[:3]) if rainy else 'variable months'} — "
        f"I keep flexible afternoon buffers on wet-season plans."
    )


def _packing_text(region_key: str, month: Optional[str]) -> str:
    profile = REGION_CONFIG[region_key]
    rainy = set(profile.get("rainy_months") or [])
    is_rainy = (month in rainy) if month else None
    base = "Light layers, comfy walking shoes, sunscreen, and a reusable bottle."
    if is_rainy is True:
        extra = f" For {month}, add a compact rain jacket and quick-dry shoes — {profile['name']} sees heavier showers then."
    elif is_rainy is False:
        extra = f" {month} is outside the main rainy window, so breezy clothes should cover it."
    else:
        extra = " Tell me your travel month and I'll tailor the list to the season."
    return f"{base}{extra}"


_SUGGESTIONS = {
    "planning": ["Make it more relaxed", "Best months to visit?", "How much food costs?", "What should I pack?"],
    "tour": ["Plan a full day around this", "What else is nearby?", "Best months to visit?"],
    "budget": ["Plan a trip inside that budget", "What should I pack?", "Best months to visit?"],
    "best_time": ["Plan a trip for that month", "How much will it cost?", "What should I pack?"],
    "packing": ["Plan a trip around the forecast", "Best months to visit?", "How much will it cost?"],
    "fallback": ["Plan a trip for me", "Best months to visit?", "How much will it cost?"],
}

_GREETINGS = (
    "Hi! I'm your AITinerary assistant. I can build day-by-day plans, check budgets with the real "
    "cost engine, answer opening hours and fees for every stop, and tailor packing lists by season. "
    "Where are we headed — Cebu, Manila, Palawan, Tokyo, or Singapore?",
)


def _chat_reply(message: str, context: Optional[dict] = None) -> dict:
    lowered = message.lower()
    context = context or {}
    planning_words = ("plan", "trip", "itinerary", "days", "visit", "travel", "make it", "change", "extend", "add")

    def finish(reply: str, intent: str, itinerary: Optional[dict] = None) -> dict:
        out: dict = {"reply": reply, "intent": intent, "suggestions": _SUGGESTIONS.get(intent, _SUGGESTIONS["fallback"])}
        if itinerary:
            out["itinerary"] = itinerary
        out["context"] = {
            "region": context.get("region") or (itinerary or {}).get("region_key"),
            "days": context.get("days"),
            "budget": context.get("budget"),
            "travelers": context.get("travelers"),
            "month": context.get("month"),
        }
        return out

    # ---------------------------------------------------------------- greet
    if lowered.strip() in {"hi", "hello", "hey", "yo", "good morning", "good evening"} or "help" in lowered and len(lowered) < 12:
        return finish(_GREETINGS[0], "fallback")

    # Intent priority: explicit questions ("how much…", "when should I…")
    # beat generic planning words like "trip"/"visit" inside the question.
    imperative = re.search(r"\b(plan|build|create|generate|make it|extend|change|add)\b", lowered)
    budget_q = any(word in lowered for word in ("how much", "cost", "budget", "expensive", "price"))
    time_q = any(
        phrase in lowered
        for phrase in ("best month", "best time", "when should i", "when to visit", "when is")
    )
    mentioned = _guess_message_region(message)

    # -------------------------------------------------------- budget intent
    if budget_q and not imperative:
        region_key = mentioned or context.get("region") or "cebu"
        if region_key not in REGION_CONFIG:
            region_key = "cebu"
        days = _extract_days(lowered) or int(context.get("days") or 4)
        travelers = _extract_travelers(lowered) or context.get("travelers") or "solo"
        text = _budget_estimate_text(region_key, days, travelers)
        month = _extract_month(message) or context.get("month")
        if month:
            text = f"{text} Weather around {month}: keep flexible afternoon buffers if it lands in the wet window."
        return finish(text, "budget")

    # ------------------------------------------------------- best-time intent
    if time_q and not imperative:
        region_key = mentioned or context.get("region") or "cebu"
        if region_key not in REGION_CONFIG:
            region_key = "cebu"
        return finish(_best_time_text(region_key), "best_time")

    # ------------------------------------------------------------- planning
    is_planning = any(word in lowered for word in planning_words)
    if is_planning:
        brief = _trip_brief_from_prompt(message, context)
        itinerary = generate_trip(brief)
        itinerary = dict(itinerary)
        itinerary["region_key"] = brief.region
        note = ""
        days_in_message = _extract_days(message)
        if days_in_message is None and context.get("days"):
            note = f" I kept your {context['days']}-day length."
        if _extract_budget(message) is None and context.get("budget"):
            note += f" Budget held at {_fmt(brief.region, context['budget'])}."
        replacing = bool(context.get("region"))
        if replacing:
            reply = (
                f"Proposed change: a {brief.days}-day {brief.destination} plan for a {brief.travelers} profile, "
                f"{brief.pace} pace{note}. This would replace your current plan — review it and reply "
                f"'apply' when you're happy with it."
            )
        else:
            reply = (
                f"Fresh build: a {brief.days}-day {brief.destination} plan for a {brief.travelers} profile, "
                f"{brief.pace} pace{note}. Review the proposal and open it when it looks right."
            )
        out = finish(reply, "planning", itinerary)
        stops_count = sum(len((day or {}).get("stops") or []) for day in (itinerary.get("days") or []))
        out["proposal"] = {
            "type": "itinerary-rebuild",
            "destination": itinerary.get("destination"),
            "region": itinerary.get("region"),
            "days": itinerary.get("days") and len(itinerary["days"]) or brief.days,
            "budget_total": itinerary.get("total_budget"),
            "pace": brief.pace,
            "travelers": brief.travelers,
            "stops_count": stops_count,
            "replaces_previous": replacing,
        }
        # The UI can send this straight back in `context` so typed
        # confirmations ("apply") work across turns.
        out["context"]["pending_proposal"] = {
            "itinerary": itinerary,
            "region": brief.region,
            "destination": itinerary.get("destination"),
        }
        return out

    # Explicit confirmation of a pending itinerary proposal.
    if lowered.strip() in {"apply", "yes", "confirm", "apply it", "yes apply", "looks good", "use it"}:
        pending = context.get("pending_proposal")
        if pending and isinstance(pending, dict) and pending.get("itinerary"):
            itinerary = dict(pending["itinerary"])
            itinerary["region_key"] = pending.get("region") or itinerary.get("region_key")
            reply = (
                f"Applied: your {itinerary.get('days') and 'itinerary' or 'plan'} is now open in your itinerary view."
            )
            out = finish(reply, "apply-itinerary", itinerary)
            out["applied"] = True
            return out
        return finish(
            "Nothing to apply yet — ask me to plan or change a trip first, then say 'apply'.",
            "fallback",
        )

    # Explicit discards keep the workspace untouched.
    if lowered.strip() in {"discard", "no", "cancel", "keep it", "never mind", "not now"}:
        if context.get("pending_proposal"):
            return finish("Discarded — your current plan is untouched.", "fallback")
        return finish("Nothing pending to discard. What should we plan?", "fallback")

    # ------------------------------------------------- place-specific facts
    if mentioned:
        tour_reply = chat_tour_answer(mentioned, lowered)
        if tour_reply:
            return finish(tour_reply, "tour")
    anywhere = best_tour_anywhere(lowered)
    if anywhere:
        fee = anywhere["fee"]
        fee_text = "Free entry" if fee == 0 else f"≈{fee:,} {anywhere.get('currency', '')}"
        return finish(
            (
                f"{anywhere['name']} ({anywhere['area']}): {anywhere['description']} "
                f"Hours: {anywhere['hours']}. {fee_text}. "
                f"Plan for roughly {max(anywhere['duration_min'] // 60, 1)} "
                f"hour{'s' if anywhere['duration_min'] > 60 else ''} — best in the {anywhere['best_time']}. "
                f"Local tip: {anywhere['insider_tip']}"
            ),
            "tour",
        )

    # ------------------------------------------------------- best-time intent
    if "best month" in lowered or "best time" in lowered or "when should i go" in lowered or "when to visit" in lowered:
        region_key = mentioned or context.get("region") or "cebu"
        if region_key not in REGION_CONFIG:
            region_key = "cebu"
        return finish(_best_time_text(region_key), "best_time")

    # -------------------------------------------------------- budget intent
    if "budget" in lowered or "how much" in lowered or "cost" in lowered or "expensive" in lowered:
        region_key = mentioned or _guess_message_region(str(context.get("region"))) or context.get("region") or "cebu"
        if region_key not in REGION_CONFIG:
            region_key = "cebu"
        days = _extract_days(lowered) or int(context.get("days") or 4)
        travelers = _extract_travelers(lowered) or context.get("travelers") or "solo"
        text = _budget_estimate_text(region_key, days, travelers)
        month = _extract_month(message) or context.get("month")
        tour_reply = chat_tour_answer(region_key, lowered)
        if tour_reply:
            text = f"{tour_reply} {_budget_estimate_text(region_key, days, travelers)}"
        if month:
            text = f"{text} Weather around {month}: {REGION_CONFIG[region_key].get('season_note', 'use flexible afternoon buffers.')}"
        return finish(text, "budget")

    # ------------------------------------------------------- weather intent
    if "weather" in lowered or "rain" in lowered:
        region_key = mentioned or context.get("region") or "cebu"
        if region_key in REGION_CONFIG:
            rainy = REGION_CONFIG[region_key].get("rainy_months") or []
            month = _extract_month(message) or context.get("month")
            if month:
                season = "inside the wet window" if month in rainy else "outside the main rainy months"
                reply = (
                    f"{month} in {REGION_CONFIG[region_key]['name']} is {season}. The plan hero already shows the "
                    f"live Open-Meteo forecast when the trip month is close — and every itinerary keeps a weather buffer."
                )
            else:
                reply = (
                    f"Heavy-rain window for {REGION_CONFIG[region_key]['name']}: {', '.join(rainy) if rainy else 'variable'}. "
                    "Pick a month and press Generate — if it's within a week, the forecast is live."
                )
            return finish(reply, "best_time")
        return finish(
            "I factor rainy-season risk into every itinerary, and the plan hero shows live Open-Meteo forecasts. "
            "Tell me a destination and month and I'll plan around it.",
            "best_time",
        )

    # ------------------------------------------------------ packing intent
    if "pack" in lowered or "bring" in lowered or "wear" in lowered:
        region_key = mentioned or context.get("region") or "cebu"
        if region_key not in REGION_CONFIG:
            region_key = "cebu"
        month = _extract_month(message) or context.get("month")
        return finish(_packing_text(region_key, month), "packing")

    # ---------------------------------------------------------- save intent
    if "save" in lowered or "saved" in lowered:
        return finish(
            "Any plan I build lands in your Plan tab — hit Save there and signed-in accounts keep it online, "
            "while guests keep trips on this device.",
            "fallback",
        )

    # error-question avoidance: default hand-off
    return finish(_GREETINGS[0], "fallback")


@app.post("/chat")
def chat(payload: dict):
    body = payload or {}
    message = body.get("message") or body.get("prompt") or ""
    if not message or not str(message).strip():
        raise HTTPException(status_code=400, detail="Please provide a message.")
    context = body.get("context") if isinstance(body.get("context"), dict) else None
    context = context or {}
    # Normalise context keys the frontend sends.
    return _chat_reply(str(message), context)
