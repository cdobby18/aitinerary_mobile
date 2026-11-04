from typing import Dict, List

COUNTRIES: Dict[str, Dict] = {
    "Philippines": {
        "code": "PH",
        "currency": "PHP",
        "status": "active",
        "regions": ["cebu", "manila", "palawan"],
        "default_region": "cebu",
    },
    "Japan": {
        "code": "JP",
        "currency": "JPY",
        "status": "planned",
        "regions": [],
        "default_region": None,
    },
    "Singapore": {
        "code": "SG",
        "currency": "SGD",
        "status": "planned",
        "regions": [],
        "default_region": None,
    },
}


def list_countries() -> List[str]:
    return list(COUNTRIES.keys())


def get_country(name: str):
    key = (name or "").strip()
    for country, meta in COUNTRIES.items():
        if country.lower() == key.lower() or meta.get("code", "").lower() == key.lower():
            return {"name": country, **meta}
    return None


def country_for_region(region: str) -> str:
    needle = (region or "").lower()
    for country, meta in COUNTRIES.items():
        if needle in [item.lower() for item in meta.get("regions", [])]:
            return country
    return "Philippines"
