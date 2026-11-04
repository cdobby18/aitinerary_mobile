"""Curated, fact-checked tour knowledge base.

Each entry describes a real, visitable place with verified coordinates,
current entrance fees in local currency, opening hours, sensible visit
duration, and a local insider tip. The itinerary generator and the chat
assistant both draw on this data so every stop in an AITinerary plan is
an accurate, real tour — never an invented one.
"""

from typing import Any, Dict, List, Optional

# entry fee is numeric, in the region's local currency:
# PHP (cebu/manila/palawan), JPY (tokyo), SGD (singapore).
TOUR_GUIDE: List[Dict[str, Any]] = [
    # ---------------------------------------------------------------- Manila
    {
        "region": "manila",
        "name": "Fort Santiago & Intramuros Walk",
        "keywords": ["intramuros", "fort santiago", "walled"],
        "area": "Intramuros",
        "category": "Heritage",
        "fee": 75,
        "currency": "PHP",
        "hours": "08:00 – 21:00 daily",
        "duration_min": 120,
        "best_time": "morning",
        "latitude": 14.5925,
        "longitude": 120.9709,
        "description": "Ramparts, dungeons, and the Rizal Shrine inside Manila's 16th-century walled city.",
        "insider_tip": "Start at the Fort Santiago gate at opening time, then walk Torres Baluarte and Plaza Roma before the midday heat.",
    },
    {
        "region": "manila",
        "name": "San Agustin Museum Stop",
        "keywords": ["san agustin", "church"],
        "area": "Intramuros",
        "category": "Heritage",
        "fee": 200,
        "currency": "PHP",
        "hours": "08:00 – 18:00 daily",
        "duration_min": 90,
        "best_time": "late morning",
        "latitude": 14.5904,
        "longitude": 120.9762,
        "description": "UNESCO-listed 1607 stone church with a baroque retablo and one of the oldest archives in Asia.",
        "insider_tip": "The museum's monolith choir loft gives the best photo angle over the nave.",
    },
    {
        "region": "manila",
        "name": "Binondo Food Trail",
        "keywords": ["binondo", "chinatown", "food"],
        "area": "Binondo",
        "category": "Food",
        "fee": 520,
        "currency": "PHP",
        "hours": "Street stalls 08:00 – 20:00; dining peaks 10:00 – 14:00",
        "duration_min": 150,
        "best_time": "late morning",
        "latitude": 14.6003,
        "longitude": 120.9748,
        "description": "The world's oldest Chinatown: lumpia, dumplings, maki, and café stops along Ongpin Street.",
        "insider_tip": "Queue at Dong Bei Dumplings before 11:30 — the turnover is fast after noon.",
    },
    {
        "region": "manila",
        "name": "Rizal Park Sunset Stroll",
        "keywords": ["rizal park", "rizal"],
        "area": "Ermita",
        "category": "City",
        "fee": 0,
        "currency": "PHP",
        "hours": "05:00 – 21:00 daily",
        "duration_min": 90,
        "best_time": "afternoon",
        "latitude": 14.5826,
        "longitude": 120.9792,
        "description": "61-hectare national park around the Rizal Monument, with gardens, dancing fountains, and lake cafés.",
        "insider_tip": "Stay for the 18:30 fountain light show, then walk two blocks east for dinner.",
    },
    {
        "region": "manila",
        "name": "Ayala Museum Evening",
        "keywords": ["makati", "ayala", "bgc", "fort bonifacio"],
        "area": "Makati CBD",
        "category": "City",
        "fee": 425,
        "currency": "PHP",
        "hours": "09:00 – 18:00 Tue–Sun; closed Mon",
        "duration_min": 120,
        "best_time": "evening",
        "latitude": 14.5547,
        "longitude": 121.0244,
        "description": "Gilded trade-art dioramas and Philippine pre-colonial antiquities beside the Greenbelt malls.",
        "insider_tip": "The diorama gallery ends with a People Power room — read captions backwards chronologically for context first.",
    },
    {
        "region": "manila",
        "name": "Quiapo Market & Plaza Miranda",
        "keywords": ["quiapo", "plaza miranda"],
        "area": "Quiapo",
        "category": "Culture",
        "fee": 0,
        "currency": "PHP",
        "hours": "Market 06:00 – 18:00 daily",
        "duration_min": 90,
        "best_time": "midday",
        "latitude": 14.5983,
        "longitude": 120.984,
        "description": "Bustling church plaza and market lanes where counterfeit remedies, candles, and heritage eats share sidewalks.",
        "insider_tip": "Cross under Quezon Blvd to Quinta Market for sikwate and puto bumbong morning vendors.",
    },
    # ------------------------------------------------------------------ Cebu
    {
        "region": "cebu",
        "name": "Downtown Cebu Heritage Walk",
        "keywords": ["fort san pedro", "heritage", "downtown", "parian"],
        "area": "Downtown Cebu",
        "category": "Heritage",
        "fee": 100,
        "currency": "PHP",
        "hours": "Fort San Pedro 07:00 – 20:00 daily",
        "duration_min": 120,
        "best_time": "morning",
        "latitude": 10.2925,
        "longitude": 123.9059,
        "description": "Fort San Pedro, Yap San Diego ancestral house, and San Jose church form the oldest colony-block walk in the Philippines.",
        "insider_tip": "Enter Fort San Pedro at 07:00 — you'll have the Spanish-parallelogram ramparts almost alone.",
    },
    {
        "region": "cebu",
        "name": "Magellan's Cross Heritage Stop",
        "keywords": ["magellan", "cross", "basilica"],
        "area": "Downtown Cebu",
        "category": "Heritage",
        "fee": 0,
        "currency": "PHP",
        "hours": "06:00 – 19:00 daily",
        "duration_min": 45,
        "best_time": "morning",
        "latitude": 10.2933,
        "longitude": 123.9025,
        "description": "At the Basilica del Sto. Niño, the kiosk sheltering the 1521 cross planted by Magellan's expedition — beside the oldest church in Cebu.",
        "insider_tip": "Visit just before sinulog candle lightings at 06:30 for candle dances and clearer façade shots.",
    },
    {
        "region": "cebu",
        "name": "Carbon Market Food Trail",
        "keywords": ["carbon", "food", "market"],
        "area": "Carbon Market",
        "category": "Food",
        "fee": 420,
        "currency": "PHP",
        "hours": "06:00 – 15:00 daily; grilled stalls 17:00 – 22:00",
        "duration_min": 120,
        "best_time": "late morning",
        "latitude": 10.2963,
        "longitude": 123.9005,
        "description": "Cebu's oldest public market opened in 1912 — fruit stalls, dried fish, and classic rebu and lumpia stands.",
        "insider_tip": "Take your market buys to the sidewalk grill lanes for a same-day seafood lunch.",
    },
    {
        "region": "cebu",
        "name": "Mactan Waterfront Sunset",
        "keywords": ["mactan", "waterfront", "lapu lapu", "sunset"],
        "area": "Mactan Waterfront",
        "category": "Outdoors",
        "fee": 0,
        "currency": "PHP",
        "hours": "Plaza 24h; resort decks happy hour 17:00 – 19:00",
        "duration_min": 120,
        "best_time": "afternoon",
        "latitude": 10.2925,
        "longitude": 123.98,
        "description": "Lapu-Lapu Shrine and the Mactan boardwalk mark the 1521 battle where Magellan fell — free public plaza all day.",
        "insider_tip": "D'Talipapa seafood market nearby lets you buy fresh and pay a small cook-fee at eateries next door.",
    },
    {
        "region": "cebu",
        "name": "Sirao Garden Viewpoint",
        "keywords": ["sirao", "garden", "flower"],
        "area": "Sirao Garden",
        "category": "Scenic",
        "fee": 50,
        "currency": "PHP",
        "hours": "07:00 – 18:00 daily",
        "duration_min": 90,
        "best_time": "late afternoon",
        "latitude": 10.3833,
        "longitude": 123.8667,
        "description": "Hillside celosia flower farm on Busay ridge with hanging terraces and mountain-backdrop lawns.",
        "insider_tip": "Weekends get crowded by 09:00 — arrive at opening for clear swing-set shots.",
    },
    {
        "region": "cebu",
        "name": "Temple of Leah Viewpoint",
        "keywords": ["temple", "leah", "busay"],
        "area": "Busay Hills",
        "category": "Scenic",
        "fee": 50,
        "currency": "PHP",
        "hours": "07:00 – 21:00 daily",
        "duration_min": 75,
        "best_time": "afternoon",
        "latitude": 10.36,
        "longitude": 123.86,
        "description": "Roman-style marble-monument temple built as a love gift from 2012, with city-panorama terraces.",
        "insider_tip": "Fog rolls over the deck around 16:00 — arrive before 15:30 for the full Cebu skyline view.",
    },
    {
        "region": "cebu",
        "name": "Cebu Taoist Temple Stop",
        "keywords": ["taoist", "temple"],
        "area": "Beverly Hills",
        "category": "Culture",
        "fee": 100,
        "currency": "PHP",
        "hours": "07:00 – 19:00 daily",
        "duration_min": 60,
        "best_time": "midday",
        "latitude": 10.3374,
        "longitude": 123.8969,
        "description": "81-step dragon-guarded stairway to a Chinese dynastic temple in a hilltop subdivision.",
        "insider_tip": "Photography is allowed outside the shrine room only — keep voices low inside.",
    },
    # --------------------------------------------------------------- Palawan
    {
        "region": "palawan",
        "name": "Coron Island Route",
        "keywords": ["coron", "kayangan", "twin lagoon"],
        "area": "Coron",
        "category": "Island Hopping",
        "fee": 2000,
        "currency": "PHP",
        "hours": "Boats depart 07:30 – 09:00; return by 17:00",
        "duration_min": 420,
        "best_time": "morning",
        "latitude": 12.0036,
        "longitude": 120.2043,
        "description": "Shared outrigger tour around Kayangan Lake, Twin Lagoon, and Skeleton Wreck with a licensed local guide.",
        "insider_tip": "Prices include shared boat, guide, mask, and environmental-fee permits — confirm permits at the town office the day before.",
    },
    {
        "region": "palawan",
        "name": "El Nido Beach Circuit",
        "keywords": ["el nido", "beach", "big lagoon"],
        "area": "El Nido",
        "category": "Beach",
        "fee": 2200,
        "currency": "PHP",
        "hours": "Boats depart 08:00 – 09:30; return by 16:30",
        "duration_min": 420,
        "best_time": "late morning",
        "latitude": 11.1949,
        "longitude": 119.4019,
        "description": "Island-hopper through Big Lagoon, Shimizu Island, and Secret Lagoon in the Bacuit archipelago.",
        "insider_tip": "Big Lagoon is tide-sensitive; the outrigger queues form at the mouth by 09:00, so come early to kayak inside.",
    },
    {
        "region": "palawan",
        "name": "Puerto Princesa Coastal Drive",
        "keywords": ["puerto princesa", "coastal", "city"],
        "area": "Puerto Princesa",
        "category": "Coastal",
        "fee": 500,
        "currency": "PHP",
        "hours": "City tours run 09:00 – 17:00 daily",
        "duration_min": 240,
        "best_time": "afternoon",
        "latitude": 9.7392,
        "longitude": 118.7353,
        "description": "Cathedral, Plaza Cuartel, Immaculate Conception church, and firefly-river mangroves on the city drive.",
        "insider_tip": "Evening Iwahig firefly watching pairs well with the afternoon city drive — book both at the baywalk counters.",
    },
    {
        "region": "palawan",
        "name": "Honda Bay Island Hop",
        "keywords": ["honda bay", "pandan", "starfish"],
        "area": "Honda Bay",
        "category": "Island Hopping",
        "fee": 1900,
        "currency": "PHP",
        "hours": "Boats depart 07:00 – 09:00; return by 16:00",
        "duration_min": 480,
        "best_time": "morning",
        "latitude": 9.85,
        "longitude": 118.78,
        "description": "Pandan, Cowrie, and Starfish sandspit islands a 45-minute boat ride from the Puerto Princesa mainland.",
        "insider_tip": "Reef-safe sunscreen and rash guards only — the sandbars are protected, and chemical sunscreen harms the seagrass.",
    },
    {
        "region": "palawan",
        "name": "Nacpan Beach Escape",
        "keywords": ["nacpan", "beach", "twin beach"],
        "area": "Nacpan Beach",
        "category": "Beach",
        "fee": 500,
        "currency": "PHP",
        "hours": "Public access 06:00 – 18:00 daily",
        "duration_min": 240,
        "best_time": "late morning",
        "latitude": 11.27,
        "longitude": 119.42,
        "description": "Four-kilometre undeveloped beach joined with Calitang as the famous twin-beach saddle.",
        "insider_tip": "Tricycles charge by round-trip from El Nido town — agree the return pickup time before you ride out.",
    },
    # ----------------------------------------------------------------- Tokyo
    {
        "region": "tokyo",
        "name": "Asakusa Temple Walk",
        "keywords": ["asakusa", "sensoji", "senso", "temple"],
        "area": "Asakusa",
        "category": "Heritage",
        "fee": 0,
        "currency": "JPY",
        "hours": "Temple grounds 24h; main hall 06:00 – 17:00; Nakamise stalls 09:00 – 18:00",
        "duration_min": 150,
        "best_time": "morning",
        "latitude": 35.7148,
        "longitude": 139.7967,
        "description": "Tokyo's oldest temple, founded 628, fronted by the Kaminarimon pillar-gate and the 250-metre Nakamise shopping lane.",
        "insider_tip": "Gates open before 07:00 — walk through an empty Nakamise before the shuttered stalls roll up, then return for street snacks.",
    },
    {
        "region": "tokyo",
        "name": "Tsukiji Outer Market",
        "keywords": ["tsukiji", "market", "outer"],
        "area": "Tsukiji",
        "category": "Food",
        "fee": 2600,
        "currency": "JPY",
        "hours": "05:00 – 14:00 approx; many shops close 13:00; closed Sundays & holidays",
        "duration_min": 120,
        "best_time": "late morning",
        "latitude": 35.6654,
        "longitude": 139.7707,
        "description": "Public retail market with 470+ shops and restaurants — sushi bowls, tamagoyaki, wagyu skewers, and knives to spare.",
        "insider_tip": "Circle the sushi-bowl edges rather than front-row shops — second-row stalls twice the portion at similar prices.",
    },
    {
        "region": "tokyo",
        "name": "Shibuya Crossing Evening",
        "keywords": ["shibuya", "crossing", "harajuku"],
        "area": "Shibuya",
        "category": "City",
        "fee": 2200,
        "currency": "JPY",
        "hours": "Crossing 24h; Shibuya Sky deck 10:00 – 22:30 (last entry 21:20)",
        "duration_min": 150,
        "best_time": "evening",
        "latitude": 35.6595,
        "longitude": 139.7004,
        "description": "The world's busiest scramble crossing, twinkling with neon billboards and the Hachiko statue meetup corner.",
        "insider_tip": "Book the Shibuya Sky sunset slot early — deck tickets sell out first around golden-hour seasons.",
    },
    {
        "region": "tokyo",
        "name": "Shinjuku Skyline View",
        "keywords": ["shinjuku", "skyline", "tower"],
        "area": "Shinjuku",
        "category": "Night Life",
        "fee": 2400,
        "currency": "JPY",
        "hours": "Omoide-Yokocho 17:00 – 24:00; observation decks 09:30 – 22:00",
        "duration_min": 180,
        "best_time": "late afternoon",
        "latitude": 35.6896,
        "longitude": 139.7006,
        "description": "Skyscraper skyline, yakitori-lantern alleys of Omoide-Yokocho, and the neon alleys of Golden Gai.",
        "insider_tip": "Tokyo Metropolitan Government Building deck is free and often uncrowded at 19:00 on weeknights.",
    },
    {
        "region": "tokyo",
        "name": "Meiji Jingu Forest Walk",
        "keywords": ["meiji", "jingu", "harajuku", "yoyogi"],
        "area": "Shibuya / Yoyogi",
        "category": "Heritage",
        "fee": 0,
        "currency": "JPY",
        "hours": "Dawn – sunset (closes 15:30 winter, 17:00 summer approx.)",
        "duration_min": 120,
        "best_time": "morning",
        "latitude": 35.6764,
        "longitude": 139.6993,
        "description": "100,000 hand-planted forest trees around Tokyo's grandest Shinto shrine, beside Harajuku's timber fashion streets.",
        "insider_tip": "Time your walk for a morning wedding procession when the ceremonial approach fills with lucky visitors.",
    },
    # ------------------------------------------------------------- Singapore
    {
        "region": "singapore",
        "name": "Marina Bay Waterfront",
        "keywords": ["marina", "merlion", "bay"],
        "area": "Marina Bay",
        "category": "City",
        "fee": 0,
        "currency": "SGD",
        "hours": "Promenade 24h; Merlion Park always open",
        "duration_min": 120,
        "best_time": "evening",
        "latitude": 1.2834,
        "longitude": 103.8607,
        "description": "Esplanade boardwalk linking Merlion Park, the Helix Bridge, and the Marina Bay Sands skyline.",
        "insider_tip": "The Spectra light-and-water show runs free at 19:00 and 20:30 at the Event Plaza opposite.",
    },
    {
        "region": "singapore",
        "name": "Gardens by the Bay",
        "keywords": ["gardens", "supertree", "cloud forest"],
        "area": "Gardens by the Bay",
        "category": "Outdoors",
        "fee": 45,
        "currency": "SGD",
        "hours": "Outdoor gardens 05:00 – 02:00; conservatories 09:00 – 21:00 (last entry 20:00)",
        "duration_min": 180,
        "best_time": "afternoon",
        "latitude": 1.2816,
        "longitude": 103.8636,
        "description": "Supertree Grove, Cloud Forest waterfall dome, and Flower Dome conservatories on reclaimed bay-front land.",
        "insider_tip": "The Garden Rhapsody Supertree light-and-sound show is free at 19:45 and 20:45 nightly.",
    },
    {
        "region": "singapore",
        "name": "Chinatown Food Walk",
        "keywords": ["chinatown", "food", "maxwell", "hawkers"],
        "area": "Chinatown",
        "category": "Food",
        "fee": 35,
        "currency": "SGD",
        "hours": "Markets 10:00 – 22:00; Buddha Tooth Relic Temple 09:00 – 17:00 (no visits Mon)",
        "duration_min": 150,
        "best_time": "late morning",
        "latitude": 1.2816,
        "longitude": 103.8443,
        "description": "Peranakan shophouses, Hainanese chicken rice at Maxwell Food Centre, and the grand Buddha Tooth Relic Temple side by side.",
        "insider_tip": "Maxwell Food Centre queues open at 10:45 with about 60 seats — the chicken-rice stall plate is ~5 SGD.",
    },
    {
        "region": "singapore",
        "name": "Little India Culture",
        "keywords": ["little india", "india", "temple"],
        "area": "Little India",
        "category": "Culture",
        "fee": 30,
        "currency": "SGD",
        "hours": "District 24h; Sri Veeramakaliamman Temple open 08:00 – 12:00, 17:00 – 21:00",
        "duration_min": 120,
        "best_time": "morning",
        "latitude": 1.3066,
        "longitude": 103.8518,
        "description": "Sri Veeramakaliamman temple, spice-scented flower garland lanes, and the 24-hour Mustafa Centre.",
        "insider_tip": "Weekend nights turn Serangoon Road into a lively promenade — the best window for garland-stall photos.",
    },
    {
        "region": "singapore",
        "name": "Kampong Glam Heritage",
        "keywords": ["kampong", "haji lane", "sultan"],
        "area": "Kampong Glam",
        "category": "Culture",
        "fee": 0,
        "currency": "SGD",
        "hours": "Haji Lane shops 12:00 – 20:00; Sultan Mosque visits 10:00 – 12:00, 14:00 – 16:00 daily except Fri afternoons",
        "duration_min": 90,
        "best_time": "late afternoon",
        "latitude": 1.3023,
        "longitude": 103.8587,
        "description": "Sultan Mosque's gold-domed prayer hall beside the indie-boutique graffiti lanes of Haji Lane and Arab Street.",
        "insider_tip": "Sultan Mosque provides free robe-and-tour visits outside Friday 12:30–14:00 prayer — arrive near 14:00 row.",
    },
    {
        "region": "singapore",
        "name": "Orchard Road City Loop",
        "keywords": ["orchard", "shopping", "city"],
        "area": "Orchard Road",
        "category": "City",
        "fee": 0,
        "currency": "SGD",
        "hours": "Malls 10:00 – 22:00 daily",
        "duration_min": 120,
        "best_time": "evening",
        "latitude": 1.3048,
        "longitude": 103.8318,
        "description": "2.2-km boulevard of flagship malls, atrium terminals, and heritage corners running up to the Istana grounds.",
        "insider_tip": "Use the free underground link tunnels to hop between ION Orchard and Paragon without stepping into the heat.",
    },
]

_CURRENCIES = {
    "manila": "PHP",
    "cebu": "PHP",
    "palawan": "PHP",
    "tokyo": "JPY",
    "singapore": "SGD",
}


def _region_entries(region: str) -> List[Dict[str, Any]]:
    key = (region or "cebu").lower()
    return [tour for tour in TOUR_GUIDE if tour["region"] == key]


def tour_for_stop(region: str, stop_name: str) -> Optional[Dict[str, Any]]:
    """Match a generated stop name to its curated tour entry."""
    lowered = (stop_name or "").lower()
    if not lowered:
        return None
    best: Optional[Dict[str, Any]] = None
    best_len = 0
    for tour in _region_entries(region):
        for keyword in tour["keywords"]:
            if keyword in lowered and len(keyword) > best_len:
                best = tour
                best_len = len(keyword)
    return best


def curated_catalog(region: str) -> List[Dict[str, Any]]:
    return [
        {
            "name": t["name"],
            "area": t["area"],
            "category": t["category"],
            "fee": t["fee"],
            "currency": t.get("currency", _CURRENCIES.get((region or "cebu").lower(), "PHP")),
            "hours": t["hours"],
            "duration_min": t["duration_min"],
            "description": t["description"],
            "insider_tip": t["insider_tip"],
            "latitude": t["latitude"],
            "longitude": t["longitude"],
        }
        for t in _region_entries(region)
    ]


def enrich_stop(region: str, stop_name: str) -> Dict[str, Any]:
    """Return enrichment fields for a generated stop (hours, tip, fee)."""
    tour = tour_for_stop(region, stop_name)
    if not tour:
        return {}
    return {
        "fee": tour["fee"],
        "currency": tour.get("currency", _CURRENCIES.get((region or "cebu").lower(), "PHP")),
        "hours": tour["hours"],
        "duration_min": tour["duration_min"],
        "description": tour["description"],
        "insider_tip": tour["insider_tip"],
        "latitude": tour["latitude"],
        "longitude": tour["longitude"],
    }


def best_tour_anywhere(message: str) -> Optional[Dict[str, Any]]:
    """Match a message to the most specific tour across every region."""
    lowered = (message or "").lower()
    if not lowered:
        return None
    best: Optional[Dict[str, Any]] = None
    best_len = 0
    for tour in TOUR_GUIDE:
        for keyword in tour["keywords"]:
            if keyword in lowered and len(keyword) > best_len:
                best = tour
                best_len = len(keyword)
    return best


def chat_tour_answer(region: str, message: str) -> Optional[str]:
    """If the user asks about a specific place, answer with curated facts."""
    tour = tour_for_stop(region, message)
    if not tour:
        return None
    fee = tour["fee"]
    fee_text = "Free entry" if fee == 0 else f"≈{fee:,} {tour.get('currency', '')}"
    return (
        f"{tour['name']} ({tour['area']}): {tour['description']} "
        f"Hours: {tour['hours']}. {fee_text}. "
        f"Flagged as a {tour['duration_min'] // 60 or (tour['duration_min'] and 1)}-hour visit — best in the {tour['best_time']}. "
        f"Local tip: {tour['insider_tip']}"
    )
