from dataclasses import dataclass
from typing import Dict, List, Literal

from backend.models import TripBrief

RiskLevel = Literal["low", "moderate", "high"]

REGION_META: Dict[str, Dict[str, List[str]]] = {
    "cebu": {
        "themes": ["heritage", "food", "beaches", "island views"],
        "stops": [
            "Downtown Cebu Heritage Walk",
            "Carbon Market Food Trail",
            "Mactan Waterfront Sunset",
            "Sirao Garden Viewpoint",
            "Magellan's Cross Heritage Stop",
            "Temple of Leah Viewpoint",
        ],
        "rainy_months": {"June", "July", "August", "September"},
        "weather_note": "Cebu can get warm, humid afternoons and sudden showers, especially around coastal routes.",
        "local_hint": "Cebu works best with short hops between downtown heritage blocks, local food stops, and a late-afternoon waterfront buffer.",
    },
    "manila": {
        "themes": ["history", "food", "night markets", "city culture"],
        "stops": [
            "Intramuros Walk",
            "Binondo Food Trail",
            "Rizal Park",
            "Makati CBD",
            "Quezon City Culture Stop",
            "Fort Bonifacio City Loop",
        ],
        "rainy_months": {"June", "July", "August", "September"},
        "weather_note": "Metro Manila can experience intense rain bursts and heavy traffic during wet afternoons.",
        "local_hint": "Manila is best paced with compact heritage blocks, food districts, and short rides between neighborhoods.",
    },
    "palawan": {
        "themes": ["island hopping", "kayaking", "reef views", "beach reset"],
        "stops": [
            "Coron Island Route",
            "El Nido Beach Circuit",
            "Puerto Princesa Coastal Drive",
            "Coastal Kayak Loop",
            "Honda Bay Island Hop",
            "Nacpan Beach Escape",
        ],
        "rainy_months": {"June", "July", "August", "September", "October"},
        "weather_note": "Palawan is more weather-sensitive for ocean activities, so rough seas and rain can quickly change plans.",
        "local_hint": "Palawan performs best when the ocean-heavy jumps are staggered and one flexible half-day remains for weather shifts.",
    },
    "tokyo": {
        "themes": ["temples", "food", "city views", "shopping"],
        "stops": [
            "Asakusa Temple Walk",
            "Tsukiji Outer Market",
            "Shibuya Crossing Evening",
            "Shinjuku Skyline View",
        ],
        "rainy_months": {"June", "July", "September"},
        "weather_note": "Tokyo summers are humid with sudden showers; spring and autumn are milder.",
        "local_hint": "Tokyo works best by neighborhood clusters with short metro hops between districts.",
    },
    "singapore": {
        "themes": ["gardens", "food", "city walks", "culture"],
        "stops": [
            "Marina Bay Waterfront",
            "Chinatown Food Walk",
            "Gardens by the Bay",
            "Little India Culture",
        ],
        "rainy_months": {"November", "December", "January"},
        "weather_note": "Singapore has frequent short, heavy showers, especially in the afternoon.",
        "local_hint": "Singapore is easiest by MRT with compact walks through each district.",
    },
}


@dataclass
class PlannerDraft:
    day: int
    theme: str
    stops: List[str]
    risk_level: RiskLevel
    risk_summary: str
    backup_plan: str


def _region_profile(brief: TripBrief) -> Dict[str, List[str]]:
    region_key = (brief.region or "cebu").lower()
    return REGION_META.get(region_key, REGION_META["cebu"])


def _day_theme(brief: TripBrief, day: int, region_profile: Dict[str, List[str]]) -> str:
    interests = [item.lower() for item in brief.interests]
    region_themes = region_profile["themes"]
    if any(item in interests for item in ["beach", "beaches", "island", "reef", "coastal"]):
        return "Beach + local flavor day"
    if any(item in interests for item in ["food", "dining", "market", "street"]):
        return "Food-forward culture day"
    if any(item in interests for item in ["history", "heritage", "culture"]):
        return "Heritage + city exploration day"
    if day % 2 == 0:
        return f"Outdoor {region_themes[0]} circuit"
    return f"Balanced {region_themes[1]} and local discovery day"


def planner_agent(brief: TripBrief) -> List[PlannerDraft]:
    days: List[PlannerDraft] = []
    region_profile = _region_profile(brief)
    rainy_months = region_profile["rainy_months"]
    weather_note = region_profile["weather_note"]
    local_hint = region_profile["local_hint"]

    for day in range(1, brief.days + 1):
        outdoor_heavy = day % 2 == 0
        is_rainy = brief.month in rainy_months
        risk_level: RiskLevel = "moderate" if is_rainy and outdoor_heavy else "low"

        if is_rainy and outdoor_heavy and (brief.pace == "packed" or brief.travelers in {"family", "friends"}):
            risk_level = "high"

        risk_summary = (
            f"{weather_note} Rain risk is elevated in this season; keep outdoor blocks flexible and retain a backup indoor plan. {local_hint}"
            if risk_level == "moderate"
            else f"{weather_note} Conditions are manageable and the route is stable for this day. {local_hint}"
            if risk_level == "low"
            else f"{weather_note} Weather risk is high; prioritize indoor or sheltered activities for the most exposed segments. {local_hint}"
        )

        if risk_level == "high":
            backup_plan = "Swap the exposed ocean or outdoor block for a museum, market, or covered food stop and preserve the rest of the day for lower-risk local exploration."
        elif risk_level == "moderate":
            backup_plan = "Keep the first half of the day flexible and replace the final outdoor segment with a heritage, food, or indoor market visit."
        else:
            backup_plan = "This day is stable; keep the current route but leave a light buffer for weather changes and local transfer delays."

        theme = _day_theme(brief, day, region_profile)
        base_stops = region_profile["stops"]
        stop_count = len(base_stops)

        if stop_count >= 4:
            primary_index = (day - 1) % stop_count
            secondary_index = (primary_index + 2) % stop_count
            primary_stop, secondary_stop = base_stops[primary_index], base_stops[secondary_index]
        else:
            primary_stop = base_stops[0] if day % 2 == 1 else base_stops[-1]
            secondary_stop = base_stops[1] if day % 2 == 1 else base_stops[0]

        days.append(
            PlannerDraft(
                day=day,
                theme=theme,
                stops=[primary_stop, secondary_stop],
                risk_level=risk_level,
                risk_summary=risk_summary,
                backup_plan=backup_plan,
            )
        )

    return days


def logistics_agent(draft_days: List[PlannerDraft], brief: TripBrief):
    region_key = (brief.region or "cebu").lower()
    travelers = (brief.travelers or "solo").lower()
    pace = (brief.pace or "balanced").lower()

    profile_map = {
        "manila": {
            "first_mode": "Grab or jeepney",
            "second_mode": "Short ride",
            "first_eta": 25,
            "first_fare": 140,
            "second_eta": 18,
            "second_fare": 60,
        },
        "cebu": {
            "first_mode": "Grab or tricycle",
            "second_mode": "Walk",
            "first_eta": 20,
            "first_fare": 90,
            "second_eta": 12,
            "second_fare": 0,
        },
        "palawan": {
            "first_mode": "Van or tricycle",
            "second_mode": "Short boat or ride",
            "first_eta": 30,
            "first_fare": 180,
            "second_eta": 20,
            "second_fare": 80,
        },
        "tokyo": {
            "first_mode": "JR or metro",
            "second_mode": "Short walk",
            "first_eta": 18,
            "first_fare": 220,
            "second_eta": 10,
            "second_fare": 0,
        },
        "singapore": {
            "first_mode": "MRT",
            "second_mode": "Short walk",
            "first_eta": 15,
            "first_fare": 30,
            "second_eta": 8,
            "second_fare": 0,
        },
    }
    profile = profile_map.get(region_key, profile_map["cebu"])

    if travelers in {"family", "friends"}:
        profile["first_fare"] = int(profile["first_fare"] * 1.4)
        profile["second_fare"] = int(profile["second_fare"] * 1.5)
    if pace == "packed":
        profile["first_eta"] = max(10, profile["first_eta"] - 5)

    transport = []
    for draft in draft_days:
        transport.append(
            {
                "day": draft.day,
                "legs": [
                    {
                        "from": "Hotel",
                        "to": draft.stops[0],
                        "mode": profile["first_mode"],
                        "eta_minutes": profile["first_eta"],
                        "fare": profile["first_fare"],
                    },
                    {
                        "from": draft.stops[0],
                        "to": draft.stops[1],
                        "mode": profile["second_mode"],
                        "eta_minutes": profile["second_eta"],
                        "fare": profile["second_fare"],
                    },
                ],
            }
        )
    return transport


def budget_agent(draft_days: List[PlannerDraft], brief: TripBrief):
    region_multiplier = {
        "manila": 1.2,
        "cebu": 1.0,
        "palawan": 1.35,
        "tokyo": 4.5,
        "singapore": 1.6,
    }.get((brief.region or "cebu").lower(), 1.0)

    traveler_multiplier = {
        "solo": 1.0,
        "couple": 1.4,
        "family": 1.9,
        "friends": 1.7,
    }.get(brief.travelers, 1.0)

    accommodation = round(1800 * brief.days * region_multiplier * traveler_multiplier)
    food = round(900 * brief.days * region_multiplier * traveler_multiplier)
    activity_multiplier = 1.2 if brief.region in {"tokyo", "singapore"} else 1.1 if brief.region == "palawan" else 1.0
    activities = round(brief.days * 750 * activity_multiplier)
    transport = round(sum(80 * 2 for _ in draft_days) * region_multiplier)
    total = accommodation + food + activities + transport
    return {
        "accommodation": accommodation,
        "food": food,
        "activities": activities,
        "transport": transport,
        "total": total,
    }


def orchestrate(brief: TripBrief):
    draft_days = planner_agent(brief)
    logistics = logistics_agent(draft_days, brief)
    budget = budget_agent(draft_days, brief)

    return {
        "draft_days": draft_days,
        "logistics": logistics,
        "budget": budget,
    }
