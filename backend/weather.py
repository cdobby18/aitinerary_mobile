"""Shared weather service.

The frontend previously called Open-Meteo directly, which meant the AI layer
and risk logic could never see live conditions. This module centralizes the
call behind the backend and labels results honestly:

- ``met_now`` months: live Open-Meteo current conditions + 7-day outlook.
- any other month: seasonal estimate derived from curated rainy-month data.
- any failure: an explicit "live unavailable" response, never fake data.
"""
from datetime import datetime
from typing import Optional

import httpx

from backend.regions import REGION_PROFILES, get_region_profile

MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

WEATHER_LABELS = {
    0: ("clear", "sunny-outline"),
    1: ("mostly clear", "sunny-outline"),
    2: ("partly cloudy", "partly-sunny-outline"),
    3: ("overcast", "cloud-outline"),
    45: ("foggy", "cloud-outline"),
    48: ("foggy", "cloud-outline"),
    51: ("drizzle", "rainy-outline"),
    53: ("drizzle", "rainy-outline"),
    55: ("drizzle", "rainy-outline"),
    61: ("rain", "rainy-outline"),
    63: ("rain", "rainy-outline"),
    65: ("heavy rain", "rainy-outline"),
    80: ("showers", "rainy-outline"),
    81: ("showers", "rainy-outline"),
    82: ("heavy showers", "rainy-outline"),
    95: ("thunderstorms", "thunderstorm-outline"),
    96: ("thunderstorms", "thunderstorm-outline"),
    99: ("thunderstorms", "thunderstorm-outline"),
}


def _month_is_current(month: Optional[str]) -> bool:
    if not month:
        return True
    try:
        return month.strip().capitalize() == datetime.now().strftime("%B")
    except Exception:
        return False


def _region_coords(region_key: str) -> Optional[dict]:
    profile = REGION_PROFILES.get(region_key)
    if not profile:
        return None
    default_stop = (profile.get("stop_profiles") or {}).get("default") or {}
    lat, lng = default_stop.get("latitude"), default_stop.get("longitude")
    if lat is None or lng is None:
        return None
    return {"latitude": lat, "longitude": lng}


def _open_meteo(coords: dict) -> Optional[dict]:
    """Live call. Returns None on any failure so callers degrade honestly."""
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={coords['latitude']}&longitude={coords['longitude']}"
            "&current=temperature_2m,weather_code,precipitation"
            "&daily=temperature_2m_max,precipitation_probability_max"
            "&timezone=auto&forecast_days=7"
        )
        response = httpx.get(url, timeout=6.0)
        response.raise_for_status()
        data = response.json()
        current = data.get("current") or {}
        daily = data.get("daily") or {}
        temps = daily.get("temperature_2m_max") or []
        rains = daily.get("precipitation_probability_max") or []
        temp = current.get("temperature_2m")
        if temp is None:
            return None
        label, _icon = WEATHER_LABELS.get(int(current.get("weather_code", 0) or 0), ("clear", "sunny-outline"))
        return {
            "temp": round(float(temp)),
            "label": label,
            "rain_chance": max([int(r or 0) for r in rains], default=0)
            or round((current.get("precipitation") or 0) * 10),
            "avg_temp": round(sum(float(t) for t in temps) / len(temps)) if temps else round(float(temp)),
        }
    except Exception:
        return None


def get_weather(region_key: str, month: Optional[str] = None) -> dict:
    profile = get_region_profile(region_key)
    rainy = list(profile.get("rainy_months") or [])
    coords = _region_coords(region_key)

    use_live = coords is not None and (
        month is None or _month_is_current(month)
    )
    live = _open_meteo(coords) if use_live else None

    if month and month.strip().capitalize() in rainy:
        seasonal = "inside the main rainy window — keep flexible buffers and backups"
    else:
        seasonal = "outside the main rainy months"

    if live:
        return {
            "region": region_key,
            "destination": profile["name"],
            "month": month,
            "source": "open_meteo",
            "live": True,
            "current": live,
            "rainy_months": rainy,
            "season_note": seasonal,
            "note": "Live conditions and 7-day outlook from Open-Meteo.",
        }

    if use_live and coords is not None:
        note = "Live weather is unavailable right now — showing seasonal guidance only."
    elif coords is None:
        note = "No forecast coordinates for this region yet — showing seasonal guidance only."
    else:
        note = "Trips in other months use seasonal estimates, not a live forecast."
    return {
        "region": region_key,
        "destination": profile["name"],
        "month": month,
        "source": "seasonal_estimate",
        "live": False,
        "current": None,
        "rainy_months": rainy,
        "season_note": seasonal,
        "note": note,
    }
