# AITinerary Project Journal

## 2026-11-01 — Project initialization

- Reviewed the planning docs in `markdowns/00-project-spec.md` through `markdowns/04-agents.md`.
- Confirmed the MVP direction: full-stack from scratch, low-cost stack, and a single-region Philippines beta rather than a whole-country rollout.
- Chosen implementation strategy: build a region-configurable full-stack MVP with a typed trip-generation API and an Expo mobile client shell.
- Priority

## 2026-11-01 — Scaffolding started

- Creating root workspace structure for the monorepo.
- Setting up a TypeScript API backend with a structured itinerary contract and mock generation for the beta.
- Preparing a React Native / Expo app shell that consumes the API while keeping UI concerns isolated from AI logic.

## 2026-11-01 — Validation and fixes

- Installed API and mobile dependencies.
- Confirmed the backend TypeScript build passes: `npm --workspace apps/api run build`.
- Identified an Expo workspace config issue caused by an incorrect `main` entry path and fixed it by switching to the standard Expo entry pattern.
- Added the required web export dependencies (`react-dom`, `react-native-web`, `@expo/metro-runtime`) to support a browser smoke test.
- Moved the Expo entry to the repo root so Metro resolves the app from the workspace root without the earlier entry-path issue.
- Verified the app now exports successfully with `npx expo export --platform web --output-dir dist`.
- Verified the backend still compiles cleanly with `npm --workspace apps/api run build`.
- The project is now in a stable scaffold state with a valid API layer and a runnable mobile app entry path.

## 2026-11-01 — Region-aware API milestone

- Added a `region` parameter to the trip brief and aligned the API schema with the Philippines-first beta design.
- Added a region config layer for Manila, Cebu, and Palawan with transport profiles and rainy-season risk messaging.
- Refined the mock itinerary generation to include realistic day-by-day transport legs, budget summaries, and risk flags.
- Updated the mobile app UI to display the region, budget summary, and more realistic itinerary output from the backend.
- Validated the backend build and Expo web export after the API refinement: both pass successfully.

## 2026-11-01 — Python backend confirmed

- Created a Python 3.13 virtual environment because Python 3.14 is not compatible with the FastAPI/Pydantic stack in the current environment.
- Installed FastAPI, Pydantic, and Uvicorn successfully in that environment.
- Booted the backend with `uvicorn backend.main:app --host 0.0.0.0 --port 8000` and confirmed the `/health` endpoint responds successfully.
- This confirms the Python-first backend architecture is working before the agent orchestration layer is added.

## 2026-11-01 — Frontend cleanup and final structure

- Moved the mobile app shell into the correct `frontend/mobile` directory so it is no longer mixed into the repo root.
- Removed stale TypeScript workspace and package files that were scattered outside the intended architecture.
- Verified the frontend builds successfully in its corrected location with `npx expo export --platform web --output-dir dist`.
- The repository now reflects the intended professional layout: `frontend`, `backend`, and `ai` as separate concerns.

## 2026-11-01 — Python-first architecture confirmed

- Replaced the temporary TypeScript backend with a Python FastAPI service and centralized the API contract in `backend/models.py`.
- Moved the AI orchestration layer into the dedicated `ai/` module and removed the circular dependency on the FastAPI app.
- Verified the backend compiles and the trip-generation route responds successfully with realistic itinerary output.
- Confirmed the environment uses Python 3.13 because Python 3.14 is incompatible with the installed FastAPI/Pydantic stack in this environment.

## 2026-11-01 — Local app flow validated

- Started the Python backend on the local API port and validated the `/health` and `/trip/generate` endpoints.
- Added CORS support so the Expo frontend can call the backend during local development.
- Updated the mobile app to target the active local backend and fixed request-error handling for API validation.
- Exported the Expo web app successfully, confirming the React Native frontend still compiles cleanly in the correct folder structure.
- The system is now in a credible end-to-end MVP state: backend, AI orchestration, and frontend are all aligned and runnable in the current workspace.

## 2026-11-01 — Next implementation priority

- Connect the frontend to the backend in the live local environment and refine handoff UX for the trip-generation flow.
- Add more realistic region logic for Cebu/Palawan/Manila, including local transport assumptions and weather-aware day planning.
- Extend the AI layer beyond the beta rule-based planner toward a more agentic, service-aware orchestration model.
- Prepare for real API integrations with mapping, weather, and booking services once the MVP flow is stable.

## 2026-11-01 — Region-aware logic upgrade

- Expanded the AI planner to use destination region, travel month, traveler profile, and user interests to shape itinerary themes and budget assumptions.
- Added location-specific route logic for `cebu`, `manila`, and `palawan`, with corresponding transport assumptions and rainy-season adjustments.
- Updated the planner to produce more realistic stop sequencing and risk summaries rather than generic repeatable templates.
- Validated the orchestrator against multiple sample briefs, including Cebu, Palawan, and Manila scenarios.
- Confirmed the FastAPI endpoint still generates valid structured output after the region-aware update.

## 2026-11-01 — Local transport realism upgrade

- Refined the AI logistics layer so each region has different local modes of movement (Grab/tricycle/jeepney/van/boat-like rides), fares, and timing assumptions.
- Adjusted cost modeling for traveler count and pace so the itinerary stays more believable for solo, couple, family, and friend groups.
- Confirmed the logistics output remains valid and non-generic across Cebu, Palawan, and Manila scenarios.
- This keeps the project in the correct MVP order: realistic local planning before integrating real map/weather data sources.

## 2026-11-01 — Final working snapshot for continuation

- Core stack is Python-first: `frontend/` for Expo app, `backend/` for FastAPI API, `ai/` for orchestration logic.
- Shared data contract lives in `backend/models.py` and is used consistently by both the API layer and the AI layer.
- Local backend is validated and responding on `127.0.0.1:8001`.
- Local frontend app is serving successfully on `http://localhost:8081` with CORS support in place.
- The MVP is currently stable enough to continue tomorrow with the next layer: deeper local-realism and travel-data integrations.
- Recommended next work tomorrow: richer transport realism, weather-aware day planning, and eventual external mapping/weather service integration.
- The system remains intentionally scoped as a Philippines-first beta, with architecture ready for future expansion to Japan, Singapore, and beyond.

## 2026-11-02 — Weather-aware trip logic

- Updated the AI planner to incorporate rainy-season logic by region and month, not just static trip type.
- Added stronger risk thresholds for packed itineraries and larger traveler groups during seasonal weather risk windows.
- Improved the generated risk commentary to explain why outdoor blocks are elevated or stable based on local weather patterns.
- Validated the planner with multiple Cebu, Manila, and Palawan scenarios to ensure the risk logic shifts correctly by destination and season.
- This keeps the MVP aligned with the intended real-world planning model before external weather or map APIs are added.

## 2026-11-02 — Backup-plan layer added

- Added a `backup_plan` field to each day in the trip contract so weather-sensitive days include a concrete fallback recommendation.
- Updated the AI planner to generate indoor alternatives when rainy-season risk rises or when the trip pace becomes more packed.
- Confirmed the response model, orchestrator, and API layer all produce valid day-by-day fallback plans.
- This is the latest ordered MVP step before moving into either deeper UX polish or real weather/map integrations.

## 2026-11-02 — Backup-plan UI surfaced

- Added the weather backup-plan text to the mobile itinerary cards so the fallback recommendation is visible in the generated trip plan.
- Styled the risk and fallback summary clearly within each day card to improve clarity without increasing app complexity.
- Confirmed the backend still returns valid backup-plan data and the Expo app remains compatible with the richer itinerary response.

## 2026-11-02 — Destination realism upgrade

- Refined the generated itineraries to assign more realistic local areas and categories for Cebu, Manila, and Palawan stops.
- Adjusted backend cost assumptions so each destination has a more plausible local spending pattern instead of generic city-center values.
- Kept the contract and orchestration flow stable while improving the realism of the trip output.
- The project remains in the correct ordered sequence: realistic destination behavior before external service integration.

## 2026-11-02 — Mobile planner UX refinement

- Improved the Expo form to include clearer labels, traveler selection, pace selection, and month input for a more polished trip-planning flow.
- Kept the same backend contract and API shape while making the app feel closer to a real planning product.
- Added stronger visual grouping for budget, trip notes, and itinerary results so the mobile UX appears more intentional and premium.
- Verified the backend still returns valid trip data and the frontend still compiles successfully for web export after the UI update.

## 2026-11-02 — Region profile module added

- Centralized destination metadata into `backend/regions.py` so stop areas, categories, and costs are defined once per region.
- Refactored `backend/main.py` to consume the shared region profile instead of hardcoded logic inline.
- This makes the project easier to scale into future countries while keeping the Philippines beta clean and maintainable.
- Verified that Cebu, Palawan, and Manila all produce realistic destination-specific stop metadata without breaking the API contract.

## 2026-11-02 — Result screen polish

- Improved the mobile result display with an overview row for days, budget, pace, and travelers.
- Kept the generated itinerary information easier to scan without changing the backend contract or API structure.
- Confirmed the app still compiles successfully for web export and the backend still yields valid trip output after the UI refinement.
- The product now feels closer to a real travel planner, while preserving the current MVP scope and architecture.

## 2026-11-02 — Result flow aligned to design system

- Updated the result screen to look more like a product-ready mobile summary, using overview cards, summary blocks, and stronger CTA actions.
- Aligned the visual language with the design system described in `design.md`, including teals, coral CTAs, and card-based layout structure.
- Kept the app behavior stable by preserving the same API and data model while improving the final presentation.
- Verified the backend still produces valid itinerary output and the Expo app still compiles cleanly after the design refinement.

## 2026-11-04 — Persistence, weather, map, assets, and tests

- Added AsyncStorage persistence for saved trips, auth session, and onboarding state.
- Added live weather via Open-Meteo with fallbacks and attribution.
- Replaced the stylized map preview with a real OpenStreetMap/Leaflet map on web and react-native-maps on native, plus optional Google Maps.
- Generated app icon, adaptive icon, splash, and favicon assets.
- Added backend unittest suite and frontend typecheck scripts.

## 2026-11-04 — Auth, hardening, database, multi-country, and CI

- Implemented backend auth with SQLite/SQLAlchemy, bearer tokens, verification, password reset, refresh, and rate limiting.
- Added multi-country support for Japan and Singapore.
- Improved regional budget realism and weather forecast support.
- Added CI workflow and backend Dockerfile.
- Updated design system and to-do tracking.

## 2026-11-04 — Conversational AI assistant

- Added a `/chat` backend endpoint with rule-based travel advice and itinerary generation.
- Updated the mobile chat planner into a conversational message log.

## 2026-11-04 — Accurate curated tours + tour-aware chatbot

- Added `backend/tours.py`: a curated, fact-checked tour knowledge base covering Manila, Cebu, Palawan, Tokyo, and Singapore — real stop names, verified coordinates, current entrance fees in local currency, opening hours, visit duration, and insider tips.
- Itinerary generation now enriches every stop with the curated data (`hours`, `duration_minutes`, `insider_tip`, accurate fee, currency).
- Added `GET /tours/{region}` returning the per-destination curated catalogue.
- Chat assistant now answers place questions with curated facts (hours, fees, tips) and attributes cross-region places correctly (Tsukiji → Tokyo, Kayangan → Palawan); destination detection extends to Tokyo/Singapore prompts.
- Frontend stop cards show opening hours, the real description, and the insider tip; all amounts render in the destination's currency (₱ / ¥ / S$).
- Tests extended to cover curated stop details, the tours endpoint, and chat tour answers (11/11 pass).

## 2026-11-07 — Mobile-only design refresh (Home / My Trips / Explore / Profile)

- Rebuilt the app navigation to match `AITinerary-mobile-only-design.md`: the bottom tab bar is now Home, My Trips, Explore, and Profile; the previous Plan/Saved/Insights tabs were retired (planner became a focused flow, Insights was dropped from the MVP).
- New Home dashboard: brand header with notification bell (unread indicator + local notifications panel), hero with "Plan Smarter. Travel Better." and destination search with recent-search chips, four quick-action tiles (Plan Trip, Explore, Map, AI Assistant), upcoming-trip card from saved trips (with an empty state), a curated destination carousel labeled "Explore destinations", and the soft-teal AI assistant promo card.
- New Explore screen: destination search, category chips (Beaches & Islands, Nature & Adventure, Food & Culture, City Breaks, Family-Friendly), a destination grid filtered by category/query, and curated collections. Unsupported searches render an honest "no matches" state.
- My Trips screen replaces Saved: trips split into Upcoming and Past sections with status chips and per-section empty states.
- Plan Trip flow is now a guided 5-step wizard (Destination → Dates & travelers → Preferences → Review → Generate) with progress bar, validation, review-and-edit steps, and an honest Generate CTA; focused flows hide the bottom tab bar per the spec.
- The itinerary result screen gained a horizontally scrollable day selector; the AI assistant moved to a dedicated chat screen with suggested prompt chips, a fixed composer, and a typing indicator.
- Theme tokens switched to the approved palette (teal #0D9C9A / deep teal #123C3A / soft teal #DDF4F0 / coral #F0785A / background #F8FAF9 / ink #172B3A) and headings moved to bold Inter. Playfair Display is no longer referenced anywhere except its unused package entry.
- Search, Explore feeds, notifications, and curated collections are hardcoded frontend data for now; the backend additions they need (search/suggest endpoint, notifications, shared weather endpoint, curated feed, AI confirmation flow, structured chat replies, trip dates) are recorded as Planned items in ToDo_Table.md.
- Verified with `tsc --noEmit` (clean), `expo export -p web` (bundles), and the backend unittest suite (11/11 pass).

## 2026-11-07 — Fix: itinerary view crash on failed generation

- Reproduced a crash reported after generating an itinerary: when the generation request failed, the focused itinerary view rendered `renderItinerary()` with no result data and threw on `result.budget_summary`, leaving a blank screen ("nothing happened").
- Added a guarded render path in `renderMain`: `loading → loading state`, `result → itinerary`, otherwise a new "Itinerary unavailable" error state with Back to planner / Back to home actions.
- Network fetch failures now surface a friendlier message ("Can't reach the planner service…") in both the wizard and the assistant instead of raw browser errors.
- Verified headless (Chrome DevTools Protocol over the exported web bundle): full happy path renders the itinerary (hero, budget snapshot, reasoning, Day 1–4 selector, 8 stops), and the backend-down path renders the error state instead of a blank screen. `tsc --noEmit` clean; backend suite 11/11.
- Note for local runs: the backend must be started from the repo root (`uvicorn backend.main:app --app-dir <repo root>`); launching `main:app` from inside `backend/` shadows the stdlib `email` module with `backend/email.py`.
