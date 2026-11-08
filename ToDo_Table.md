# AITinerary To-Do Table

## Current MVP Goal
Build a region-aware Philippines-first beta trip planner that works as a mobile app, connected to a Python backend and AI orchestration layer.

## Priority Order

| Priority | Task | Status | Notes | Next Action |
| --- | --- | --- | --- | --- |
| P0 | Finalize architecture and contract stability | Done | Python backend + AI + mobile frontend are separated and functioning | Keep contract stable before new features |
| P0 | Validate backend + AI orchestration | Done | API returns structured itinerary and risk data | Re-run smoke tests after any schema change |
| P0 | Validate frontend and local API connectivity | Done | Expo app compiles and can fetch backend data | Keep local dev flow working |
| P1 | Mobile-only design refresh (Home / My Trips / Explore / Profile) | Done | App now follows `AITinerary-mobile-only-design.md`: new Home dashboard, Explore screen, guided 5-step Plan Trip wizard, assistant chat screen, itinerary day selector, approved teal/coral palette | Continue with accessibility pass and simulator testing |
| P1 | Destination search/suggest backend endpoint | Done | `GET /destinations/search` matches regions, countries, and travel tags; UI hits the backend first with a local fallback for offline — no invented destinations | Keep suggestions in sync as regions expand |
| P1 | AI assistant confirmation flow for itinerary changes | Done | `/chat` returns a proposal block + `context.pending_proposal`; the UI shows a proposal card with Apply/Discard instead of applying instantly | Add remove_tours.json detection |
| P1 | Shared backend weather endpoint | Done | `GET /weather/{region}` centralizes Open-Meteo: live conditions for current-month trips, clearly-labeled seasonal estimates otherwise; frontend no longer calls Open-Meteo directly | Let the risk logic consume the same endpoint |
| P1 | Improve region realism for Cebu, Manila, and Palawan | In Progress | Local transport, budget, risk, and day themes are more realistic and location-specific | Add more destination-specific area and cost values |
| P1 | Weather-aware trip planning | Done | Live Open-Meteo current conditions and monthly forecast integrated | Keep tuning for edge cases |
| P1 | Mobile UX polish and itinerary clarity | Done | Risk and backup plan are visible, with a premium dark mobile layout and form polish | Continue with realism and travel-data improvements |
| P1 | Result screen polish | Done | Overview cards, layered itinerary layout, animated result state, and mobile interaction polish are in place | Add final data realism improvements and empty/loading states |
| P1 | AI itinerary rationale and loading UX | Done | Result cards now show AI reasoning and better loading states for trip generation | Keep improving credibility and travel logic |
| P1 | Add real destination data scripts and seeded local datasets | Done | Seed data and coordinates added for Philippines destinations | Expand for new countries |
| P1 | Add Google Maps API integration | Done | Web and native provider support with optional API key | Add keys for production |
| P1 | Add .env / secrets config for API keys | Done | Backend/frontend env files and examples are in place | Keep secrets out of source control |
| P2 | Premium mobile experience enhancements | Done | Glassmorphism, dark luxury theme, layered cards, animated transitions, onboarding, and strong mobile interactions | Move to deeper realism and final UX validation |
| P2 | Add deeper local data assumptions | In Progress | Expanded stop sets, coordinates, and budgets for 5 destinations | Continue tuning |
| P2 | Centralize destination config | Done | Region-specific stop metadata is in `backend/regions.py` | Reuse this pattern for future countries |
| P2 | Notifications backend | Done | `notifications` table + `GET /notifications` and `POST /notifications/read`; welcome notification on signup; signed-in UI renders server notifications, guests keep the bundled list | Add notification kinds for trip reminders |
| P2 | Curated/destinations feed endpoint | Done | `GET /destinations/featured` returns the curated ordering (PH first); Bohol has a full region profile and is searchable/weather-ready; Explore joins the feed with local photos | Wire curated collections to backend data next |
| P2 | Trip start/end dates and status in the contract | Planned | My Trips splits Upcoming/Past from a free-text month field only | Add structured start/end dates to the trip contract for accurate status |
| P2 | Structured chat reply format | Planned | Assistant returns prose + optional itinerary JSON; the UI has no structured preview cards or to-do chips | Define a typed chat response shape (message + proposed change + preview) |
| P2 | Add external API integrations | Planned | Weather, maps, and transport provider APIs | Integrate after MVP is stable |
| P3 | Expand beyond Philippines beta | In Progress | Japan and Singapore region data and frontend picks added | Add UI grouping and more regions |
| P3 | Deploy and production readiness | In Progress | Auth, env config, DB, logging, CI, and Docker added | Continue hardening |

## Ordered Roadmap

### Phase 1 — Stable MVP foundation
- Keep `frontend/`, `backend/`, and `ai/` separated
- Keep Python-first architecture
- Maintain shared contract in `backend/models.py`
- Keep API + AI smoke checks stable

### Phase 2 — Realistic trip planning
- Improve region config per destination
- Tune cost assumptions for traveler type and pace
- Expand weather-aware planning and backup logic
- Improve itinerary summary presentation

### Phase 3 — External data integration
- Add weather data source
- Add map or routing data source
- Add local transport assumptions from authoritative service data
- Improve budget realism and attraction metadata

### Phase 4 — Experience, polish, and expansion
- Add more screens and user interactions
- Add saved trips, favorites, and planning history
- Add country abstraction for future expansions
- Prepare deployment pipeline and environment management

## Current Focus
- Continue improving region realism for the Philippines beta
- Polish mobile itinerary UX so trip cards feel more helpful and premium
- Hold the architecture stable while adding realism

## Backlog
- Better local attraction metadata by region
- Map pin visualization
- AI chat planner improvements (intent parsing, multi-turn context)
- AI chat assistant (conversational travel bot) - Done
- Risk / weather alert badges
- Transit time and walking route realism
- Multi-day route optimization
- Trip save and share flow
- User authentication and profile storage
- Multi-country expansion scaffolding
- Accessibility pass on the refreshed screens (dynamic type, contrast on photo overlays, 44pt targets audit)
- Remove Playfair Display dependency (no longer used after the design refresh)

## Notes
- Keep the scope narrow and realistic for the MVP.
- Prioritize correctness and structure before adding external services.
- Use the project journal as the memory layer for decisions and progress.

## Master Status Board

### TODO
| Task | Priority | Notes |
| --- | --- | --- |
| Add external API integrations | Done | Weather (Open-Meteo), maps (OSM/Google), and backend auth are integrated | Keep tuning realism |
| Expand beyond Philippines beta | P3 | Prepare country abstraction for Japan, Singapore, and beyond |
| Deploy and production readiness | P3 | Auth, env config, DB, logging, observability |
| Better local attraction metadata by region | Backlog | Add richer destination data for each Philippines region |
| Map pin visualization | Backlog | Visual travel routes and point-of-interest mapping |
| Risk / weather alert badges | Backlog | Better visibility for weather and safety context |
| Transit time and walking route realism | Backlog | Improve local movement accuracy and estimated time |
| Multi-day route optimization | Backlog | Smarter ordering of routes across multiple days |
| Trip save and share flow | Backlog | Saved trips and shareable itinerary experience |
| User authentication and profile storage | Backlog | Personal accounts and stored trip history |
| Multi-country expansion scaffolding | Backlog | Future-ready architecture beyond Philippines |

### IN PROGRESS
| Task | Priority | Notes |
| --- | --- | --- |
| Improve region realism for Cebu, Manila, and Palawan | P1 | Local transport, budget, risk, and day themes are more realistic and location-specific |
| Add deeper local data assumptions | P2 | Realistic transport, attraction timing, and local costs |

### COMPLETED
| Task | Priority | Notes |
| --- | --- | --- |
| Finalize architecture and contract stability | P0 | Python backend + AI + mobile frontend are separated and functioning |
| Validate backend + AI orchestration | P0 | API returns structured itinerary and risk data |
| Validate frontend and local API connectivity | P0 | Expo app compiles and can fetch backend data |
| Weather-aware trip planning | P1 | Rainy-season logic and backup plan are integrated |
| Centralize destination config | P2 | Region-specific stop metadata is in `backend/regions.py` |
| Mobile UX polish and itinerary clarity | P1 | Risk and backup plan are visible with improved app flow |
| Result screen polish | P1 | Overview cards, layered result layout, and better itinerary summary |
| Premium mobile experience enhancements | P2 | Glassmorphism, dark luxury theme, layered cards, animated transitions, onboarding, and stronger interactions |
| AI itinerary rationale and loading UX | P1 | Result cards now show AI reasoning and better loading states for trip generation |
| Add map config scaffolding | Done | Create env examples and backend map config so Google Maps API can be plugged in cleanly without hardcoding secrets |
| Update mobile map state | Done | Have the mobile UI read maps config and show live status in the floating map card |
| Validate API and app flow | Done | Run backend smoke tests for the new config endpoint and confirm the app still renders cleanly |

## Accurate tours milestone (2026-11-04)
- Curated tour knowledge base (5 destinations) — Done
- Accurate fees, hours, durations, insider tips in itineraries — Done
- Tour-aware chatbot with cross-region place attribution — Done
- Currency-aware costs in the mobile UI — Done
