"""Destination discovery helpers for the Explore and Home search surfaces.

Everything here is derived from the curated region profiles and country
registry — search never invents destinations that the planner cannot build.
"""
from typing import List

from backend.countries import country_for_region, get_country
from backend.regions import REGION_PROFILES, get_region_profile


def _destination_card(region_key: str) -> dict:
    profile = get_region_profile(region_key)
    country = get_country(country_for_region(region_key)) or {}
    mood = {
        "cebu": "islands + food",
        "bohol": "nature + beaches",
        "manila": "city + culture",
        "palawan": "lagoon escape",
        "tokyo": "city + culture",
        "singapore": "gardens + city",
    }.get(region_key, (profile.get("travel_style") or "").split(" + ")[0])
    return {
        "id": region_key,
        "name": profile["name"],
        "region": region_key,
        "country": country.get("name") or country_for_region(region_key),
        "currency": country.get("currency") or "PHP",
        "mood": mood,
        "tagline": profile.get("travel_style") or "",
        "best_for": list(profile.get("best_for") or []),
        "base_daily_budget": profile.get("base_daily_budget"),
        "rainy_months": list(profile.get("rainy_months") or []),
    }


# Curated ordering: Philippines first, then East Asia picks.
_ORDER = ["cebu", "palawan", "bohol", "manila", "tokyo", "singapore"]


def featured_destinations() -> List[dict]:
    known = [key for key in _ORDER if key in REGION_PROFILES] + [
        key for key in REGION_PROFILES if key not in _ORDER
    ]
    return [_destination_card(key) for key in known]


def search_destinations(query: str) -> List[dict]:
    """Match region names, slugs, countries, and travel tags."""
    needle = (query or "").strip().lower()
    if not needle:
        return featured_destinations()

    matches = []
    for key in REGION_PROFILES:
        card = _destination_card(key)
        haystack = " ".join(
            [
                key,
                card["name"].lower(),
                card["country"].lower(),
                " ".join(card["best_for"]).lower(),
                card["mood"].lower(),
                card["tagline"].lower(),
            ]
        )
        score = 0
        if needle in key or needle in card["name"].lower():
            score += 3
        elif needle in haystack:
            score += 1
        for word in needle.split():
            if len(word) > 2 and word in haystack:
                score += 1
        if score:
            matches.append((-score, key, card))

    matches.sort(key=lambda item: (item[0], _ORDER.index(item[1]) if item[1] in _ORDER else 99))
    cards = [card for _score, _key, card in matches]

    # A bare country query ("philippines") should surface the whole country.
    if len(cards) <= 1:
        for key in REGION_PROFILES:
            if (country_for_region(key) or "").lower() == needle and all(
                card["id"] != key for card in cards
            ):
                cards.append(_destination_card(key))
    return cards
