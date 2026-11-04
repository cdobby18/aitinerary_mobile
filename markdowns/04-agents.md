# AITinerary — Build-Team Agent Roles

> These are **development-process agents** — roles you can assign to yourself, collaborators, or AI coding assistants (e.g., as Claude Code subagents) to divide the build cleanly. Distinct from the product's runtime agents defined in `00-project-spec.md` §5.

---

## UI Agent

**Mandate:** Own everything the traveler sees and touches.

**Responsibilities:**
- Build the trip-brief intake flow (conversational or form-based)
- Build the itinerary display: day-by-day cards, map overlays, budget tracker, risk flags
- Maintain design consistency (spacing, typography, color system — see design skills below)
- Handle loading/error states for long-running itinerary generation
- Ensure platform-appropriate patterns (iOS vs. Android navigation/gestures)

**Inputs it needs from other agents:** structured itinerary JSON from the Backend Agent, including per-day stops, transport legs, cost, and risk flags.

**Definition of done for MVP:** a traveler can input a trip brief, see a loading state, and view a polished day-by-day itinerary with a map — on a real device, not just a simulator.

---

## Backend Agent

**Mandate:** Own the API layer, data persistence, and orchestration plumbing (not the AI reasoning itself — that's the AI Agent's job).

**Responsibilities:**
- API Gateway: auth, validation, rate limiting
- Invoke the Orchestrator (AI Agent's system) and return structured results to the client
- Persist trips, user profiles, cached Places/Directions responses
- Manage external API credentials securely (see `03-security.md`)
- Cache aggressively to control Google Maps API cost

**Inputs it needs from other agents:** the expected input/output schema for the Orchestrator (defined jointly with the AI Agent).

**Definition of done for MVP:** a client request produces a persisted, retrievable itinerary via a clean API contract, with secrets never exposed client-side.

---

## AI Agent (the "AI Engineering" core)

**Mandate:** Own the agentic reasoning system — this is the heart of the project and where most of the portfolio value lives.

**Responsibilities:**
- Design and implement the Orchestrator + sub-agents (Itinerary Planner, Local Logistics, Risk & Weather, Budget — see `00-project-spec.md` §5)
- Define each sub-agent's system prompt, tool access, and output schema
- Enforce structured (JSON schema) outputs so the Backend Agent doesn't need to parse free text
- Build the reasoning-trace output (human-readable explanation of key decisions) — this is what makes the product feel "agentic" rather than a single prompt call
- Evaluate and iterate on output quality (does a real PH traveler agree the plan is realistic?)

**Inputs it needs from other agents:** the data sources the Backend Agent exposes (Maps API results, weather data, transport cost dataset).

**Definition of done for MVP:** given a natural-language trip brief, the system produces a structured itinerary with visible reasoning for at least one non-trivial trade-off (e.g., a budget swap or a weather-driven reorder).

---

## How the Agents Hand Off (build sequence)

1. **AI Agent + Backend Agent** agree on the itinerary data schema first — this unblocks everyone.
2. **Backend Agent** stands up the API skeleton with mocked itinerary responses matching the schema.
3. **UI Agent** builds against the mocked responses — doesn't need to wait for real AI reasoning to be done.
4. **AI Agent** builds the real Orchestrator + sub-agents, swaps into the Backend Agent's endpoint once ready.
5. Integration pass: real end-to-end request → real itinerary → rendered in the real UI.

This lets all three tracks move in parallel instead of blocking on each other — useful whether you're doing this solo (switching hats) or with collaborators/AI coding assistants running each role.
