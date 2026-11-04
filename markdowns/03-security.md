# AITinerary — Security & Privacy

## 1. API Key & Secrets Management
- **Never call Google Maps, Claude API, or weather APIs directly from the mobile client.** All external API calls route through your backend, which holds the keys server-side.
- Store keys in environment variables / a secrets manager (Doppler, platform-native secrets), never committed to the repo.
- Restrict Google Maps API keys by platform (Android package name / iOS bundle ID) and by API (only enable Places, Directions, Maps SDK — not the full catalog) to limit blast radius if a key leaks.
- Rotate keys if any suspected exposure (e.g., accidentally committed, logged in plaintext).

## 2. User Data Handling
- **Minimize what you collect.** Trip briefs, saved itineraries, and basic profile info are enough for MVP — don't collect data you don't have a use for yet.
- If you store precise location history (not just trip destinations), treat it as sensitive data: encrypt at rest, limit retention, and be explicit in your privacy policy about what's kept and why.
- Philippines-specific: the **Data Privacy Act of 2012** applies if you're handling PH users' personal data — at minimum you need a clear privacy notice, a lawful basis for processing, and a way for users to request data deletion.

## 3. Authentication
- Use a managed auth provider (Supabase Auth, Firebase Auth, or Clerk) rather than rolling your own — password handling, session management, and token refresh are easy to get wrong.
- Use short-lived access tokens + refresh tokens for the mobile client's session with your backend.

## 4. LLM-Specific Risks
- **Prompt injection via user input:** a trip brief is free text — don't let it manipulate agent behavior outside its intended scope (e.g., a malicious input trying to get the agent to leak system prompts or call unintended tools). Validate/sanitize inputs and constrain what each agent's tools can actually do.
- **Don't let agents execute arbitrary actions.** Sub-agents should call well-defined tools (Maps API, weather API, budget calculator) with validated parameters — not freeform code execution or unrestricted external calls.
- **Rate-limit LLM calls per user** to control cost and prevent abuse (someone spamming itinerary generation requests).
- **Log agent reasoning traces** for debugging, but scrub any personal data before long-term storage/analytics if you ever share these logs externally (e.g., for portfolio write-ups).

## 5. Data in Transit
- HTTPS everywhere, no exceptions, including between backend and external APIs.
- If you ever add real-time features (live reroute monitoring), use WSS (secure WebSockets), not plain WS.

## 6. Dependency & Infra Hygiene
- Keep dependencies updated; run `npm audit` / equivalent regularly.
- Don't expose your database directly to the internet — access only through your backend.
- Use least-privilege DB credentials for your backend service (don't use the Supabase/DB admin key in your app server).

## 7. MVP-Appropriate Scope
You don't need enterprise-grade security infrastructure for a portfolio MVP, but the items above (no client-side API keys, managed auth, input validation, HTTPS, minimal data collection) are the non-negotiable baseline — they're also exactly what a reviewer/interviewer would check for if this becomes a portfolio piece.
