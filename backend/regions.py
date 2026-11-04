import json
from pathlib import Path

REGION_PROFILES = {
    "manila": {
        "name": "Metro Manila",
        "rainy_months": ["June", "July", "August", "September"],
        "travel_style": "urban walking + short rides",
        "base_daily_budget": 1800,
        "best_for": ["history", "food", "night life"],
        "highlights": [
            "Intramuros heritage walk",
            "Binondo food crawl",
            "Rizal Park sunset stroll",
            "Makati skyline evening",
        ],
        "transport_hints": [
            "Use Grab for city hops during peak hours.",
            "Walking works best in Intramuros and Makati pockets.",
            "Avoid midday traffic between Quezon and Makati.",
        ],
        "stop_profiles": {
            "intramuros": {"area": "Intramuros", "latitude": 14.5896, "longitude": 120.975, "category": "Heritage", "cost": 260, "timing": "morning"},
            "binondo": {"area": "Binondo", "latitude": 14.6003, "longitude": 120.9748, "category": "Food", "cost": 520, "timing": "late morning"},
            "rizal": {"area": "Rizal Park", "latitude": 14.5826, "longitude": 120.9792, "category": "City", "cost": 230, "timing": "afternoon"},
            "makati": {"area": "Makati CBD", "latitude": 14.5547, "longitude": 121.0244, "category": "Night Life", "cost": 560, "timing": "evening"},
            "quezon": {"area": "Quezon City", "latitude": 14.676, "longitude": 121.0437, "category": "Culture", "cost": 290, "timing": "midday"},
            "fort": {"area": "Fort Bonifacio", "latitude": 14.554, "longitude": 121.05, "category": "City", "cost": 330, "timing": "late afternoon"},
            "quiapo": {"area": "Quiapo", "latitude": 14.5983, "longitude": 120.984, "category": "Culture", "cost": 210, "timing": "midday"},
            "default": {"area": "Makati / City Center", "latitude": 14.5995, "longitude": 120.9842, "category": "Local Discovery", "cost": 280, "timing": "flexible"},
        },
    },
    "cebu": {
        "name": "Cebu",
        "rainy_months": ["June", "July", "August", "September"],
        "travel_style": "coastal and city mix",
        "base_daily_budget": 1700,
        "best_for": ["food", "beaches", "heritage"],
        "highlights": [
            "Carbon Market food walk",
            "Mactan waterfront sunset",
            "Sirao Garden viewpoint",
            "Downtown heritage route",
        ],
        "transport_hints": [
            "Use a private transfer for Mactan and coastal stops.",
            "Cebu City is easiest by short taxi hops and tricycles.",
            "Plan waterfront time for cooler late afternoon hours.",
        ],
        "stop_profiles": {
            "fort": {"area": "Downtown Cebu", "latitude": 10.2925, "longitude": 123.9059, "category": "Culture", "cost": 240, "timing": "morning"},
            "carbon": {"area": "Carbon Market", "latitude": 10.2963, "longitude": 123.9005, "category": "Food", "cost": 420, "timing": "late morning"},
            "mactan": {"area": "Mactan Waterfront", "latitude": 10.2925, "longitude": 123.98, "category": "Outdoors", "cost": 320, "timing": "afternoon"},
            "osmena": {"area": "Osmeña Park", "latitude": 10.295, "longitude": 123.9032, "category": "City", "cost": 200, "timing": "early evening"},
            "sirao": {"area": "Sirao Garden", "latitude": 10.3833, "longitude": 123.8667, "category": "Scenic", "cost": 350, "timing": "late afternoon"},
            "magellan": {"area": "Downtown Cebu", "latitude": 10.2933, "longitude": 123.9025, "category": "Heritage", "cost": 220, "timing": "morning"},
            "temple": {"area": "Busay Hills", "latitude": 10.36, "longitude": 123.86, "category": "Scenic", "cost": 300, "timing": "afternoon"},
            "default": {"area": "Downtown Cebu", "latitude": 10.2925, "longitude": 123.9059, "category": "Local Discovery", "cost": 250, "timing": "flexible"},
        },
    },
    "tokyo": {
        "name": "Tokyo",
        "rainy_months": ["June", "July", "September"],
        "travel_style": "metro + neighborhood walks",
        "base_daily_budget": 12000,
        "best_for": ["food", "culture", "shopping"],
        "highlights": [
            "Asakusa temple walk",
            "Shibuya crossing evening",
            "Tsukiji outer market",
            "Shinjuku skyline view",
        ],
        "transport_hints": [
            "Use JR and metro day passes for cross-city hops.",
            "Walking is best within each neighborhood.",
            "Avoid rush hour on central lines.",
        ],
        "stop_profiles": {
            "asakusa": {"area": "Asakusa", "category": "Heritage", "cost": 1800, "timing": "morning", "latitude": 35.7148, "longitude": 139.7967},
            "shibuya": {"area": "Shibuya", "category": "City", "cost": 2200, "timing": "evening", "latitude": 35.6595, "longitude": 139.7004},
            "tsukiji": {"area": "Tsukiji", "category": "Food", "cost": 2600, "timing": "late morning", "latitude": 35.6654, "longitude": 139.7707},
            "shinjuku": {"area": "Shinjuku", "category": "Night Life", "cost": 2400, "timing": "late afternoon", "latitude": 35.6896, "longitude": 139.7006},
            "default": {"area": "Central Tokyo", "category": "Local Discovery", "cost": 2000, "timing": "flexible", "latitude": 35.6762, "longitude": 139.6503},
        },
    },
    "singapore": {
        "name": "Singapore",
        "rainy_months": ["November", "December", "January"],
        "travel_style": "metro + walkable districts",
        "base_daily_budget": 180,
        "best_for": ["food", "city", "gardens"],
        "highlights": [
            "Marina Bay waterfront",
            "Chinatown food walk",
            "Gardens by the Bay",
            "Little India culture",
        ],
        "transport_hints": [
            "MRT covers most sights efficiently.",
            "Walking is comfortable in shaded districts.",
            "Carry an umbrella for sudden showers.",
        ],
        "stop_profiles": {
            "marina": {"area": "Marina Bay", "category": "City", "cost": 40, "timing": "evening", "latitude": 1.2834, "longitude": 103.8607},
            "chinatown": {"area": "Chinatown", "category": "Food", "cost": 35, "timing": "late morning", "latitude": 1.2816, "longitude": 103.8443},
            "gardens": {"area": "Gardens by the Bay", "category": "Outdoors", "cost": 45, "timing": "afternoon", "latitude": 1.2816, "longitude": 103.8636},
            "little-india": {"area": "Little India", "category": "Culture", "cost": 30, "timing": "morning", "latitude": 1.3066, "longitude": 103.8518},
            "default": {"area": "City Center", "category": "Local Discovery", "cost": 35, "timing": "flexible", "latitude": 1.3521, "longitude": 103.8198},
        },
    },
    "palawan": {
        "name": "Palawan",
        "rainy_months": ["June", "July", "August", "September", "October"],
        "travel_style": "coastal route + island transfer",
        "base_daily_budget": 2100,
        "best_for": ["island hopping", "beaches", "nature"],
        "highlights": [
            "Coron island hopping",
            "El Nido beach route",
            "Puerto Princesa coastal drive",
            "Sunset kayak loop",
        ],
        "transport_hints": [
            "Island hopping is best booked early in the morning.",
            "Coastal roads are slower in the rain and during high season.",
            "Keep one buffer day for weather shifts and ferry timing.",
        ],
        "stop_profiles": {
            "coron": {"area": "Coron", "latitude": 12.0036, "longitude": 120.2043, "category": "Island Hopping", "cost": 680, "timing": "morning"},
            "el-nido": {"area": "El Nido", "latitude": 11.1949, "longitude": 119.4019, "category": "Beach", "cost": 610, "timing": "late morning"},
            "puerto-princesa": {"area": "Puerto Princesa", "latitude": 9.7392, "longitude": 118.7353, "category": "Coastal", "cost": 470, "timing": "afternoon"},
            "kayak": {"area": "Coastal Route", "latitude": 11.15, "longitude": 119.35, "category": "Adventure", "cost": 560, "timing": "midday"},
            "beach": {"area": "Resort District", "latitude": 11.18, "longitude": 119.39, "category": "Outdoors", "cost": 380, "timing": "afternoon"},
            "coastal": {"area": "Coastal Route", "latitude": 11.15, "longitude": 119.35, "category": "Adventure", "cost": 560, "timing": "midday"},
            "honda": {"area": "Honda Bay", "latitude": 9.85, "longitude": 118.78, "category": "Island Hopping", "cost": 620, "timing": "morning"},
            "nacpan": {"area": "Nacpan Beach", "latitude": 11.27, "longitude": 119.42, "category": "Beach", "cost": 500, "timing": "late morning"},
            "default": {"area": "El Nido / Resort District", "latitude": 11.1949, "longitude": 119.4019, "category": "Outdoors", "cost": 330, "timing": "flexible"},
        },
    },
}

SEED_DATA_PATH = Path(__file__).resolve().parent / "data" / "philippines_seed.json"


def _load_seed_data():
    if not SEED_DATA_PATH.exists():
        return {}
    try:
        with SEED_DATA_PATH.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, OSError):
        return {}


SEED_DATA = _load_seed_data()


def _merge_seed_region(region: str, profile: dict):
    seed = SEED_DATA.get(region, {})
    if not seed:
        return profile

    merged = dict(profile)
    if seed.get("best_for"):
        merged["best_for"] = seed["best_for"]
    if seed.get("highlights"):
        merged["highlights"] = seed["highlights"]
    if seed.get("transport_hints"):
        merged["transport_hints"] = seed["transport_hints"]
    if seed.get("base_daily_budget"):
        merged["base_daily_budget"] = seed["base_daily_budget"]

    if "areas" in seed:
        area_map = {}
        base_profiles = profile.get("stop_profiles", {})
        for area in seed["areas"]:
            normalized_name = (area.get("name") or "default").lower().replace(" ", "-")
            base_match = next(
                (
                    value
                    for value in base_profiles.values()
                    if (value.get("area") or "").lower().replace(" ", "-") == normalized_name
                ),
                {},
            )
            area_map[normalized_name] = {
                "area": area.get("name", "Local area"),
                "category": area.get("category", "Local discovery"),
                "cost": area.get("cost", 250),
                "timing": area.get("timing", "flexible").lower(),
                "note": area.get("note", "Local highlight"),
                "latitude": area.get("latitude") or base_match.get("latitude"),
                "longitude": area.get("longitude") or base_match.get("longitude"),
            }
        if area_map:
            merged["stop_profiles"] = {**merged.get("stop_profiles", {}), **area_map}

    return merged


def get_region_profile(region: str):
    key = (region or "cebu").lower()
    profile = REGION_PROFILES.get(key, REGION_PROFILES["cebu"])
    return _merge_seed_region(key, profile)


def get_destination_snapshot(region: str):
    profile = get_region_profile(region)
    return {
        "name": profile["name"],
        "best_for": profile["best_for"],
        "highlights": profile["highlights"],
        "transport_hints": profile["transport_hints"],
        "base_daily_budget": profile["base_daily_budget"],
    }


def get_stop_profile(region: str, stop_name: str):
    profile = get_region_profile(region)
    normalized = (stop_name or "default").lower().replace(" ", "-")
    stop_profiles = profile.get("stop_profiles", {})
    if normalized in stop_profiles:
        return stop_profiles[normalized]

    # Stops arrive as display names ("Intramuros Walk"), while profiles are
    # keyed by short slugs ("intramuros"). Match the longest slug contained in
    # the stop name, then fall back to matching the profile's area name.
    candidates = [key for key in stop_profiles if key != "default" and key in normalized]
    if candidates:
        return stop_profiles[max(candidates, key=len)]

    for key, value in stop_profiles.items():
        if key == "default":
            continue
        area_slug = (value.get("area") or "").lower().replace(" ", "-")
        if area_slug and area_slug in normalized:
            return value

    return stop_profiles.get(
        "default",
        {
            "area": "Local area",
            "category": "Local discovery",
            "cost": 250,
            "timing": "flexible",
            "latitude": None,
            "longitude": None,
        },
    )
