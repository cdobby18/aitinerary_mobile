# AITinerary — Project Spec

> Written in prompt-engineering structure (Role → Context → Objective → Constraints → Workflow → Output Format → Examples) so it can be fed directly into an AI coding assistant to scaffold the build.

---

## 1. Role

You are an AI engineering assistant helping build **AITinerary**, an agentic trip-planning app that generates realistic, day-by-day itineraries for travelers — starting with the Philippines, where generic travel apps fail because they ignore local transport realities (jeepneys, tricycles, flooding, unreliable transit data).

---

## 2. Context

Most itinerary apps (TripIt, Google Travel, generic AI trip planners) assume:
- You have a car or seamless transit
- Routing between stops is trivial
- Weather/local disruptions aren't worth accounting for

In the Philippines specifically, none of that holds. A good itinerary has to account for:
- Mixed/informal transport (jeepney, tricycle, Grab, walking, ferry for island trips)
- Rainy season flooding/disruption risk
- Realistic pacing (travel time between stops is often underestimated)
- Budget reality (per-leg fares add up differently than in countries with flat transit fares)

**AITinerary's differentiator:** it doesn't just say *what* to see, it plans *how you'll realistically get there and when*, with budget and weather awareness baked in.

---

## 3. Objective

Build an agentic system that:
1. Takes a trip brief in natural language (destination, days, budget, interests, pace, travel companions).
2. Generates a day-by-day itinerary with specific places, timing, and realistic transport between each stop.
3. Tracks running budget across accommodation, food, activities, and transport.
4. Flags weather/flood risk for outdoor-heavy days and suggests swaps.
5. Visualizes the itinerary on a map with day-by-day route overlays.

---

## 4. Scope

### Phase 1 — MVP (Philippines, single region)
- Single city/region itinerary generation (start with Metro Manila or one tourist province, e.g., Cebu or Palawan)
- Natural language intake → structured day-by-day plan
- Google Maps API for places, routing, and visualization
- Static/approximate local-transport cost + time estimates (jeepney/tricycle/Grab) per leg
- Basic weather-awareness: flag "rainy season caution" on outdoor-heavy days (no live flood data yet)
- Budget tracking across the full trip

### Phase 2 — Philippines, expanded
- Multi-city/multi-region itineraries (e.g., Manila → Palawan island-hopping)
- Live weather/flood data integration, dynamic itinerary adjustment
- Group-trip mode (shared preferences/constraints across travelers)
- Local food/hidden-gem recommendation agent

### Phase 3 — Outside Philippines
- Generalize the local-transport-logistics agent to other countries' transit norms
- Localize data sources per region
- Multi-currency budget tracking

---

## 5. Agent Architecture

| Agent | Responsibility |
|---|---|
| **Itinerary Planner Agent** | Parses the trip brief, decides which places to include and in what order, paces the days |
| **Local Logistics Agent** | For each leg between stops, determines realistic transport mode, time, and fare (jeepney/tricycle/Grab/walk/ferry) |
| **Risk & Weather Agent** | Flags flood/weather risk per day, suggests indoor alternatives or reordering when risk is high |
| **Budget Agent** | Tracks running totals across accommodation/food/activities/transport, flags overages, suggests cheaper swaps |
| **Orchestrator Agent** | Coordinates all agents, resolves conflicts (e.g., Budget Agent wants a cheaper activity but Risk Agent already swapped it), produces final structured itinerary |

**Orchestration pattern:** Orchestrator receives the trip brief → Itinerary Planner drafts a candidate plan → Local Logistics Agent fills in transport between each stop → Risk Agent reviews the draft and flags/adjusts → Budget Agent reviews the adjusted draft and flags/adjusts → Orchestrator merges into final output with visible reasoning for each decision.

---

## 6. Core Workflow

1. **Intake:** User describes the trip in natural language (e.g., "5 days in Palawan, mid-range budget, love beaches and local food, traveling with my partner, visiting in July").
2. **Draft plan:** Itinerary Planner Agent selects places/activities per day based on interests and trip length.
3. **Logistics fill-in:** Local Logistics Agent determines how to get from stop to stop each day, with time/cost.
4. **Risk review:** Risk & Weather Agent checks the month/season against the plan, flags risky outdoor days (July = rainy season in Palawan), suggests swaps.
5. **Budget review:** Budget Agent totals the trip cost, compares to stated budget, flags overages with specific swap suggestions.
6. **Output:** Final day-by-day itinerary with map visualization, per-leg transport + cost, risk flags, and running budget total — plus a short explanation of key trade-off decisions the agents made.

---

## 7. Example Prompts (for testing once built)

```
"Plan a 4-day trip to Cebu, budget-friendly, I want island hopping and local food, traveling solo in June."
```
Expected: itinerary weighted toward budget options, island-hopping tour bundled (not scattered across days inefficiently), June flagged as early rainy season with a contingency note for at least one day.

```
"3 days in Baguio with my family, kids are 6 and 10, comfortable budget, want nature spots but not too much walking."
```
Expected: pacing adjusted for kids (fewer stops per day, more buffer time), family-friendly activity filtering, transport legs that avoid long uphill walks where tricycle/taxi is a better fit.

---

## 8. Success Metrics

- **Realism:** Does the plan reflect actual travel time/cost a traveler would experience, not idealized straight-line estimates?
- **Coherence:** Is the day-by-day pacing sensible (not cramming too much, not wasting time)?
- **Budget accuracy:** Does the running total match real-world costs closely?
- **Explainability:** Can the user see *why* the agent made each key decision (useful for trust and for your own demo/portfolio narrative)?

---

## 9. Related Documents

- `01-system-architecture.md` — technical architecture and data flow
- `02-tech-stack.md` — stack choices and rationale
- `03-security.md` — data handling, API key management, privacy considerations
- `04-agents.md` — build-team agent roles (UI / Backend / AI) for structuring the development work itself
