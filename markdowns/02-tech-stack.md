# AITinerary — Tech Stack

## Frontend (Mobile App)
- **Framework:** React Native (Expo) — fastest path to iOS + Android from one codebase, good for a solo/small-team build
- **Maps rendering:** `react-native-maps` + Google Maps SDK
- **State management:** Zustand or React Context (keep it simple for MVP — don't reach for Redux unless complexity demands it)
- **UI components:** Start from a solid base (NativeBase or Tamagui) rather than building every component from scratch — this is also your anti-"vibe coded" insurance

## Backend
- **Language/runtime:** Node.js (TypeScript) or Python — pick based on where your agent framework lives
  - If using LangGraph/Python-native agent tooling → Python (FastAPI) backend
  - If keeping everything JS-based for speed → Node.js (Express/Fastify)
- **API layer:** REST or tRPC (tRPC if full-stack TypeScript, for type safety between client/server)
- **Job/queue (Phase 2+):** BullMQ (Node) or Celery (Python) if itinerary generation needs to move async

## AI / Agent Layer
- **LLM:** Claude (Anthropic API) — strong at structured reasoning and multi-step planning, which is the core of this app
- **Orchestration framework:** LangGraph (if Python) for explicit multi-agent graph control, or a lightweight custom orchestrator if you want to keep dependencies minimal for MVP
- **Structured output:** Enforce JSON schema responses from each agent (itinerary objects, risk flags, budget breakdowns) so the backend doesn't have to parse free text

## Data & Storage
- **Database:** PostgreSQL (via Supabase for fastest setup — gives you auth + DB + storage in one)
- **Caching:** Redis (optional for MVP, useful once you're caching Maps API responses at scale)
- **Static datasets:** Local transport cost data as versioned JSON/CSV in the repo initially; move to DB once crowdsourcing is added

## External APIs
- **Google Maps Platform:** Places API, Directions API, Maps SDK for Android/iOS
- **Weather:** OpenWeatherMap (MVP) → PAGASA data integration (Phase 2, if a usable public feed/API exists — verify availability before committing to this)

### Maps and location data
- Google Maps Platform can be used for real map rendering, place search, and route context in the app.
- In practice, Google offers a free usage credit for new accounts, which is usually enough for personal prototypes and early beta testing.
- For development, create a billing account and add a key in `.env`, then enable the Places and Maps APIs you actually need.
- Keep the API key in backend/.env and mobile/.env instead of committing secrets into source control.
- When the key is missing, the app should remain usable in a premium demo mode with a polished fallback map preview.

## Dev & Infra
- **Hosting (backend):** Railway, Render, or Fly.io for simple deploys without heavy DevOps overhead
- **Hosting (mobile):** Expo EAS Build for app store builds
- **Environment/secrets:** `.env` + a secrets manager (Doppler or platform-native secrets) — never commit API keys (see `03-security.md`)
- **Version control:** Git, trunk-based or simple feature-branch workflow for a small team

## Suggested MVP-First Principle
Don't adopt every tool listed above on day one. For MVP: React Native + Node/FastAPI + Supabase + Claude API + Google Maps API is enough to ship a working demo. Add Redis, queues, and multi-region data modeling only when Phase 1 is actually working end-to-end.
