# AITinerary — System Architecture

## 1. High-Level Overview

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Mobile App │────▶│   API Gateway /   │────▶│   Orchestrator      │
│ (React      │◀────│   Backend Server  │◀────│   Agent (LLM-based) │
│  Native)    │     └──────────────────┘     └────────┬────────────┘
└─────────────┘                                        │
                                                         ▼
                                   ┌─────────────────────────────────────┐
                                   │  Sub-Agents (tool-calling)           │
                                   │  • Itinerary Planner Agent           │
                                   │  • Local Logistics Agent             │
                                   │  • Risk & Weather Agent              │
                                   │  • Budget Agent                      │
                                   └───────────┬───────────────────────────┘
                                               ▼
                       ┌──────────────────────────────────────────┐
                       │  External Services / Data Sources         │
                       │  • Google Maps (Places, Directions, Map)  │
                       │  • Weather API (PAGASA / OpenWeatherMap)  │
                       │  • Local transport cost dataset (curated) │
                       │  • App DB (trips, users, cached places)   │
                       └──────────────────────────────────────────┘
```

## 2. Components

### 2.1 Mobile App (Client)
- Collects trip brief via conversational or structured form UI
- Renders day-by-day itinerary with map overlays
- Displays budget tracker, risk flags, and agent reasoning summaries
- Talks to backend only through the API Gateway (no direct LLM/API key exposure)

### 2.2 API Gateway / Backend Server
- Auth, rate limiting, request validation
- Routes trip requests to the Orchestrator Agent
- Caches common Places/Directions API responses to control cost
- Persists trips, user preferences, and itinerary history

### 2.3 Orchestrator Agent
- Owns the end-to-end planning workflow (see `00-project-spec.md` §6)
- Calls sub-agents in sequence/parallel as needed
- Resolves conflicts between sub-agent outputs (e.g., budget vs. risk trade-offs)
- Produces the final structured itinerary object + human-readable reasoning trace

### 2.4 Sub-Agents
Each sub-agent is a focused tool-calling unit with a narrow responsibility (see project spec §5). Implemented either as:
- Separate LLM calls with distinct system prompts and tool access, or
- Nodes in a graph-based orchestration framework (e.g., LangGraph), each with defined inputs/outputs

### 2.5 External Services
- **Google Maps API** — Places (search/details), Directions (routing + travel time), Maps SDK (visualization)
- **Weather/Flood data** — PAGASA public data where available, OpenWeatherMap as fallback for Phase 1; live flood advisories added in Phase 2
- **Local transport cost dataset** — curated static dataset for Phase 1 (jeepney/tricycle/Grab approximate fares by region), replaced/augmented with crowdsourced data later

### 2.6 Data Store
- **Trips table** — user trip briefs, generated itineraries, status
- **Places cache** — reduces redundant Maps API calls (cost control)
- **Transport cost dataset** — versioned, region-tagged static data
- **User profile** — saved preferences, past trips (for personalization later)

## 3. Data Flow (single request)

1. Client sends trip brief → API Gateway
2. Gateway authenticates request, forwards to Orchestrator
3. Orchestrator invokes Itinerary Planner Agent → draft plan
4. Orchestrator invokes Local Logistics Agent per leg → transport filled in
5. Orchestrator invokes Risk & Weather Agent → flags applied
6. Orchestrator invokes Budget Agent → totals computed, swaps suggested if needed
7. Orchestrator merges final itinerary object
8. Gateway returns itinerary + map data to client
9. Client renders itinerary + map overlay

## 4. Scaling Considerations (keep in mind, don't over-build for MVP)

- Cache Places/Directions responses aggressively — Maps API cost scales fast with naive per-request calls
- Sub-agent calls can run in parallel where there's no dependency (e.g., Risk Agent and early Logistics calculation)
- Consider a job queue for itinerary generation if requests get complex/slow, so the client isn't blocked on a long synchronous call

## 5. Phase-to-Architecture Mapping

| Phase | Architecture change |
|---|---|
| Phase 1 (MVP) | Single region, static transport dataset, no live weather |
| Phase 2 | Add live weather/flood API, multi-region support, group-trip data model |
| Phase 3 | Abstract Local Logistics Agent behind a region-config interface so new countries can be added without rewriting core logic |
